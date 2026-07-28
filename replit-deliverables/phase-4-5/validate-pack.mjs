#!/usr/bin/env node
/**
 * AGROSBO Phase 4-5 salvage-pack validator.
 *
 * Read-only by default. Pass --write to refresh validation-report.md.
 * Uses only Node.js built-ins and derives route evidence from current TypeScript.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACK_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(PACK_DIR, '..', '..');
const REPORT_PATH = resolve(PACK_DIR, 'validation-report.md');
const args = process.argv.slice(2);
const writeReport = args.length === 1 && args[0] === '--write';

if (args.length > 0 && !writeReport) {
  console.error('Usage: node validate-pack.mjs [--write]');
  process.exit(1);
}

const ALLOWLIST = [
  'README.md',
  'source-baseline.json',
  'route-catalog.json',
  'rbac-matrix.json',
  'agent-read-conversations.es.json',
  'agent-write-confirmation-scenarios.es.json',
  'idempotency-replay-cases.json',
  'deployment-and-provider-failure-cases.json',
  'validate-pack.mjs',
  'validation-report.md',
  'manifest.json',
];
const JSON_FILES = ALLOWLIST.filter((name) => name.endsWith('.json'));
const VALID_ROLES = ['admin', 'tecnico', 'encargado', 'operario', 'finanzas'];
const PUBLIC_INTERNAL_PATHS = [
  '/health/live',
  '/health/ready',
  '/crops',
  '/auth/login',
  '/auth/me',
  '/auth/logout',
];
const VALID_CLASSIFICATIONS = [
  'VERIFIED_IN_REPOSITORY',
  'PROPOSED_TEST_CASE',
  'RUNTIME_VALIDATION_REQUIRED',
  'OPEN_DECISION',
  'NOT_IMPLEMENTED',
];
const results = [];

function check(id, description, fn) {
  try {
    const detail = fn();
    results.push({ id, description, status: 'PASS', detail: detail || 'ok' });
  } catch (error) {
    results.push({
      id,
      description,
      status: 'FAIL',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readRepo(path) {
  return readFileSync(resolve(REPO_ROOT, path), 'utf8');
}

function readPack(path) {
  return readFileSync(resolve(PACK_DIR, path), 'utf8');
}

function sameArray(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function duplicates(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function extractRouterRoutes(source, sourceFile) {
  const declaration = /\brouter\.(get|post|put|patch|delete)\s*\(\s*(['"])([^'"]+)\2/g;
  const routes = [];
  let match;
  while ((match = declaration.exec(source))) {
    const start = match.index;
    const tail = source.slice(declaration.lastIndex);
    const next = tail.search(/\brouter\.(?:get|post|put|patch|delete)\s*\(/);
    const segment = source.slice(
      start,
      next < 0 ? source.length : declaration.lastIndex + next,
    );
    const roleArguments = (segment.match(/requireRole\(([^)]*)\)/) || [])[1];
    const roleGuard = roleArguments
      ? [...roleArguments.matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1])
      : null;
    routes.push({
      method: match[1].toUpperCase(),
      routePathAsDefined: match[3],
      publicPath: `/api${match[3]}`,
      roleGuard,
      idempotent: /\bidempotent\s*\(/.test(segment),
      line: source.slice(0, start).split(/\r?\n/).length,
      sourceFile,
    });
  }
  return routes;
}

function deriveSourceEvidence() {
  const appSource = readRepo('api/src/app.ts');
  const routesSource = readRepo('api/src/routes.ts');
  const healthSource = readRepo('api/src/health.ts');
  assert(
    /app\.use\(\s*['"]\/api['"]\s*,\s*apiRouter\s*\)/.test(appSource),
    "api/src/app.ts no longer mounts apiRouter at '/api'",
  );
  const publicBlock = (appSource.match(
    /const AUTH_PUBLIC\s*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\)/,
  ) || [])[1];
  assert(publicBlock, 'AUTH_PUBLIC could not be derived from api/src/app.ts');
  const publicPaths = [...publicBlock.matchAll(/['"]([^'"]+)['"]/g)].map(
    (item) => item[1],
  );
  assert(
    sameArray(publicPaths, PUBLIC_INTERNAL_PATHS),
    `AUTH_PUBLIC mismatch: ${JSON.stringify(publicPaths)}`,
  );
  const routes = [
    ...extractRouterRoutes(healthSource, 'api/src/health.ts'),
    ...extractRouterRoutes(routesSource, 'api/src/routes.ts'),
  ].map((route) => ({
    ...route,
    authPublic: publicPaths.includes(route.routePathAsDefined),
    authRequired: !publicPaths.includes(route.routePathAsDefined),
    mutation: route.method !== 'GET',
  }));
  return { appSource, routesSource, healthSource, routes };
}

function collectRouteReferences(value, location = '$', found = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectRouteReferences(item, `${location}[${index}]`, found));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'route' && typeof item === 'string') {
        found.push({ signature: item, routeId: value.routeId, location: `${location}.${key}` });
      }
      collectRouteReferences(item, `${location}.${key}`, found);
    }
  }
  return found;
}

function collectApiSignatures(value, location = '$', found = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectApiSignatures(item, `${location}[${index}]`, found));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) =>
      collectApiSignatures(item, `${location}.${key}`, found),
    );
  } else if (
    typeof value === 'string' &&
    /^(GET|POST|PUT|PATCH|DELETE) \/api(?:\/|$)/.test(value)
  ) {
    const match = value.match(/^(GET|POST|PUT|PATCH|DELETE) (\/api[^\s(—→]+)/);
    if (match) found.push({ method: match[1], path: match[2], location });
  }
  return found;
}

function pathMatchesTemplate(path, template) {
  const escaped = template
    .split('/')
    .map((segment) =>
      segment.startsWith(':')
        ? '[^/]+'
        : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('/');
  return new RegExp(`^${escaped}$`).test(path);
}

function containsKey(value, target) {
  if (Array.isArray(value)) return value.some((item) => containsKey(item, target));
  if (!value || typeof value !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(value, target) ||
    Object.values(value).some((item) => containsKey(item, target))
  );
}

let parsed = {};
let evidence;

check('CHK-01', 'Exact allowlist is present in the pack directory', () => {
  const actual = readdirSync(PACK_DIR).sort();
  const expected = [...ALLOWLIST].sort();
  assert(sameArray(actual, expected), `Expected ${expected.join(', ')}; found ${actual.join(', ')}`);
  return `${actual.length} allowed files and no extras`;
});

check('CHK-02', 'All JSON files parse', () => {
  const errors = [];
  for (const file of JSON_FILES) {
    try {
      parsed[file] = JSON.parse(readPack(file));
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }
  }
  assert(errors.length === 0, errors.join('; '));
  return `${JSON_FILES.length} JSON files parsed`;
});

check('CHK-03', 'TypeScript route evidence can be derived', () => {
  evidence = deriveSourceEvidence();
  assert(evidence.routes.length === 88, `Expected 88 source routes, found ${evidence.routes.length}`);
  const sourceDuplicates = duplicates(
    evidence.routes.map((route) => `${route.method} ${route.publicPath}`),
  );
  assert(sourceDuplicates.length === 0, `Duplicate source routes: ${sourceDuplicates.join(', ')}`);
  return '88 routes derived from app.ts, routes.ts, and health.ts';
});

check('CHK-04', 'Route catalog exactly matches current TypeScript', () => {
  const catalog = parsed['route-catalog.json'];
  assert(catalog && evidence, 'Prerequisite parsing failed');
  assert(catalog._meta.totalRoutes === evidence.routes.length, '_meta.totalRoutes is incorrect');
  assert(catalog.routes.length === evidence.routes.length, 'Catalog route count is incorrect');
  const bySignature = new Map(
    catalog.routes.map((route) => [`${route.method} ${route.publicPath}`, route]),
  );
  const errors = [];
  for (const source of evidence.routes) {
    const signature = `${source.method} ${source.publicPath}`;
    const route = bySignature.get(signature);
    if (!route) {
      errors.push(`omitted route ${signature}`);
      continue;
    }
    if (route.routePathAsDefined !== source.routePathAsDefined)
      errors.push(`${signature}: routePathAsDefined`);
    if (route.publicPath !== `/api${route.routePathAsDefined}`)
      errors.push(`${signature}: /api prefix`);
    if (route.internalPath !== source.routePathAsDefined)
      errors.push(`${signature}: internalPath`);
    if (route.authRequired !== source.authRequired || route.authPublic !== source.authPublic)
      errors.push(`${signature}: global auth/public classification`);
    if (!sameArray(route.roleGuard, source.roleGuard))
      errors.push(`${signature}: roleGuard`);
    if (route.idempotent !== source.idempotent)
      errors.push(`${signature}: idempotency`);
    if (route.mutation !== source.mutation) errors.push(`${signature}: mutation`);
    if (
      route.evidence?.sourceFile !== source.sourceFile ||
      route.evidence?.line !== source.line
    )
      errors.push(`${signature}: source evidence`);
  }
  const sourceSignatures = new Set(
    evidence.routes.map((route) => `${route.method} ${route.publicPath}`),
  );
  for (const signature of bySignature.keys()) {
    if (!sourceSignatures.has(signature)) errors.push(`invented route ${signature}`);
  }
  assert(errors.length === 0, errors.join('; '));
  return 'No invented, omitted, mis-prefixed, mis-guarded, or falsely idempotent routes';
});

check('CHK-05', 'Route IDs are unique and sequential', () => {
  const ids = parsed['route-catalog.json'].routes.map((route) => route.id);
  assert(duplicates(ids).length === 0, `Duplicate route IDs: ${duplicates(ids).join(', ')}`);
  ids.forEach((id, index) =>
    assert(id === `R-${String(index + 1).padStart(3, '0')}`, `Unexpected route ID ${id}`),
  );
  return `${ids.length} unique route IDs`;
});

check('CHK-06', 'All fixture route references resolve to route IDs', () => {
  const catalog = parsed['route-catalog.json'];
  const bySignature = new Map(
    catalog.routes.map((route) => [`${route.method} ${route.publicPath}`, route]),
  );
  const byId = new Map(catalog.routes.map((route) => [route.id, route]));
  const errors = [];
  for (const file of JSON_FILES) {
    for (const ref of collectRouteReferences(parsed[file])) {
      const route = bySignature.get(ref.signature);
      if (!route) errors.push(`${file} ${ref.location}: unknown ${ref.signature}`);
      else if (ref.routeId !== route.id)
        errors.push(`${file} ${ref.location}: expected ${route.id}, got ${ref.routeId}`);
      if (ref.routeId && !byId.has(ref.routeId))
        errors.push(`${file} ${ref.location}: nonexistent routeId ${ref.routeId}`);
    }
    for (const ref of collectApiSignatures(parsed[file])) {
      const resolved = catalog.routes.some(
        (route) =>
          route.method === ref.method && pathMatchesTemplate(ref.path, route.publicPath),
      );
      if (!resolved)
        errors.push(`${file} ${ref.location}: invented/removed ${ref.method} ${ref.path}`);
    }
  }
  assert(errors.length === 0, errors.join('; '));
  return 'All route strings and routeId values resolve';
});

check('CHK-07', 'RBAC matrix matches global auth and route guards', () => {
  const matrix = parsed['rbac-matrix.json'];
  const roleNames = Object.keys(matrix.roles || {});
  assert(sameArray(roleNames, VALID_ROLES), `Invalid role set: ${roleNames.join(', ')}`);
  const operations = new Map();
  for (const resource of matrix.resources || []) {
    for (const [signature, operation] of Object.entries(resource.operations || {})) {
      assert(!operations.has(signature), `Duplicate RBAC operation ${signature}`);
      operations.set(signature, operation);
    }
  }
  const errors = [];
  for (const route of parsed['route-catalog.json'].routes) {
    const signature = `${route.method} ${route.publicPath}`;
    const operation = operations.get(signature);
    if (!operation) {
      errors.push(`RBAC omitted ${signature}`);
      continue;
    }
    if (operation.routeId !== route.id) errors.push(`${signature}: routeId`);
    if (operation.globalAuthRequired !== route.authRequired) errors.push(`${signature}: auth`);
    if (operation.authPublic !== route.authPublic) errors.push(`${signature}: public`);
    if (!sameArray(operation.roleGuard, route.roleGuard)) errors.push(`${signature}: roleGuard`);
    const expectedRoles = route.authPublic ? [] : route.roleGuard || VALID_ROLES;
    if (!sameArray(operation.effectiveRoles, expectedRoles)) errors.push(`${signature}: roles`);
  }
  assert(operations.size === parsed['route-catalog.json'].routes.length, 'RBAC has extra operations');
  assert(errors.length === 0, errors.join('; '));
  const roleContext = JSON.stringify(matrix);
  assert(!/"(?:roleGuard|effectiveRoles|blocked|role)"[^]*?"(?:owner|collaborator)"/i.test(roleContext), 'Prohibited internal role');
  return 'Global authentication is distinct from requireRole';
});

check('CHK-08', 'Fixture counts and IDs are exact and unique', () => {
  const specs = [
    ['agent-read-conversations.es.json', 'RC', 48],
    ['agent-write-confirmation-scenarios.es.json', 'WC', 36],
    ['idempotency-replay-cases.json', 'IC', 24],
    ['deployment-and-provider-failure-cases.json', 'DC', 24],
  ];
  for (const [file, prefix, count] of specs) {
    const cases = parsed[file].cases;
    assert(cases.length === count, `${file}: expected ${count}, found ${cases.length}`);
    const ids = cases.map((item) => item.id);
    assert(duplicates(ids).length === 0, `${file}: duplicate IDs`);
    ids.forEach((id, index) =>
      assert(id === `${prefix}-${String(index + 1).padStart(3, '0')}`, `${file}: ${id}`),
    );
  }
  return '48 read, 36 write, 24 idempotency, and 24 failure cases';
});

check('CHK-09', 'Write executions have a visible draft and explicit confirmation', () => {
  const errors = [];
  for (const scenario of parsed['agent-write-confirmation-scenarios.es.json'].cases) {
    assert(VALID_ROLES.includes(scenario.userRole), `${scenario.id}: invalid role`);
    const turns = scenario.turns || [];
    const executionIndex = turns.findIndex((turn) => containsKey(turn, 'execution'));
    if (executionIndex < 0) continue;
    const prior = turns.slice(0, executionIndex);
    if (!prior.some((turn) => containsKey(turn, 'draft'))) errors.push(`${scenario.id}: no draft`);
    const userText = prior
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.content || '')
      .join(' ');
    if (!/(confirm|sí|si,|hazlo|adelante|procede|correcto|registra|guarda|elimina|crea|marca|actualiza)/i.test(userText))
      errors.push(`${scenario.id}: no explicit confirmation`);
  }
  assert(errors.length === 0, errors.join('; '));
  return 'No silent agent mutation found';
});

check('CHK-10', 'Conversation fixtures respect ADR-018 boundaries', () => {
  const raw = [
    readPack('agent-read-conversations.es.json'),
    readPack('agent-write-confirmation-scenarios.es.json'),
  ].join('\n');
  assert(
    !/(?:el |mi )?diagnóstico definitivo (?:es|indica)|diagnóstico seguro:/i.test(raw),
    'Affirmative definitive diagnosis found',
  );
  assert(!/recomiendo (?:el |un )?(?:pesticida|fungicida|herbicida)/i.test(raw), 'Pesticide recommendation found');
  return 'No definitive diagnosis or specific pesticide recommendation';
});

check('CHK-11', 'Idempotency cases match current constants and cover payload semantics', () => {
  const source = evidence.routesSource + readRepo('api/src/idempotency.ts');
  const data = parsed['idempotency-replay-cases.json'];
  const descriptions = data.cases.map((item) => item.description);
  assert(duplicates(descriptions).length === 0, 'Duplicate idempotency descriptions');
  assert(/24 \* 60 \* 60 \* 1000/.test(source), '24-hour TTL source evidence missing');
  assert(/10 \* 60 \* 1000/.test(source), 'processing stale source evidence missing');
  assert(/IDEM_MAX_MEM = 5000/.test(source), 'memory limit source evidence missing');
  assert(/IDEMPOTENCY_IN_PROGRESS/.test(source), 'processing code source evidence missing');
  const raw = JSON.stringify(data).toLowerCase();
  assert(raw.includes('misma clave') && raw.includes('mismo payload'), 'Same-key/same-payload case missing');
  assert(raw.includes('payload distinto'), 'Same-key/different-payload case missing');
  assert(raw.includes('concurrent') || raw.includes('simultáneamente'), 'Concurrency case missing');
  assert(raw.includes('in-memory') && raw.includes('postgresql'), 'Both backends are not covered');
  return 'Replay, payload mismatch limitation, concurrency, states, and both backends covered';
});

check('CHK-12', 'Failure cases have honest explicit classifications', () => {
  const cases = parsed['deployment-and-provider-failure-cases.json'].cases;
  const errors = [];
  for (const item of cases) {
    if (!VALID_CLASSIFICATIONS.includes(item.classification))
      errors.push(`${item.id}: ${item.classification || 'missing'}`);
    if (!item.classificationRationale) errors.push(`${item.id}: rationale missing`);
  }
  assert(errors.length === 0, errors.join('; '));
  const byId = new Map(cases.map((item) => [item.id, item]));
  assert(byId.get('DC-006').classification === 'NOT_IMPLEMENTED', 'Cognito JWT overstated');
  assert(byId.get('DC-011').classification === 'NOT_IMPLEMENTED', 'S3 overstated');
  for (const id of ['DC-001', 'DC-002', 'DC-012', 'DC-013', 'DC-020', 'DC-021'])
    assert(byId.get(id).classification === 'RUNTIME_VALIDATION_REQUIRED', `${id} runtime status`);
  return 'Implemented code, proposals, future infrastructure, and runtime evidence are distinct';
});

check('CHK-13', 'Manifest and baseline counts/status flags are correct', () => {
  const manifest = parsed['manifest.json'];
  const baseline = parsed['source-baseline.json'];
  assert(manifest.baselineSha === '156036a', 'Manifest baseline');
  assert(baseline._meta.baselineSha === '156036a', 'Source baseline');
  assert(manifest.salvageSource === 'origin/replit/spec-18-readiness-plan', 'Salvage source');
  assert(manifest.totalRecords.routes === evidence.routes.length, 'Manifest route count');
  assert(manifest.totalRecords.totalFixtureRecords === 132, 'Manifest fixture total');
  assert(manifest.requiresKiroReview === true, 'requiresKiroReview');
  assert(manifest.requiresHumanPromotion === true, 'requiresHumanPromotion');
  assert(manifest.productionReady === false, 'productionReady');
  assert(manifest.zipIncluded === false, 'zipIncluded');
  assert(manifest.validatorReadOnlyByDefault === true, 'validatorReadOnlyByDefault');
  assert(baseline._meta.totalRoutes === evidence.routes.length, 'Baseline route count');
  return 'Baseline, counts, review flags, and production limitations match';
});

check('CHK-14', 'No secrets, real ARNs, ZIPs, or hard-coded localhost URLs', () => {
  const raw = ALLOWLIST.map((file) => readPack(file)).join('\n');
  assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(raw), 'Private key found');
  assert(!/\bAKIA[0-9A-Z]{16}\b/.test(raw), 'AWS access key found');
  assert(!/\barn:(?:aws|aws-us-gov|aws-cn):/i.test(raw), 'Real-looking ARN found');
  assert(!/https?:\/\/localhost(?::\d+)?/i.test(raw), 'Hard-coded localhost URL found');
  assert(!readdirSync(PACK_DIR).some((file) => file.toLowerCase().endsWith('.zip')), 'ZIP found');
  return 'No secret material, ARN, ZIP, or localhost endpoint detected';
});

check('CHK-15', 'Git changes remain inside the exact allowlist and are unstaged', () => {
  const output = execFileSync(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  const allowed = new Set(
    ALLOWLIST.map((file) => `replit-deliverables/phase-4-5/${file}`),
  );
  const errors = [];
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const indexStatus = line[0];
    const path = line.slice(3).replaceAll('\\', '/').replace(/^"|"$/g, '');
    if (indexStatus !== ' ' && indexStatus !== '?') errors.push(`staged: ${path}`);
    if (!allowed.has(path)) errors.push(`outside allowlist: ${path}`);
  }
  assert(errors.length === 0, errors.join('; '));
  return 'Only the eleven unstaged allowlisted files are present';
});

const failures = results.filter((result) => result.status === 'FAIL');
const report = [
  '# Phase 4–5 salvage pack validation report',
  '',
  `Result: **${failures.length === 0 ? 'PASS' : 'FAIL'}**`,
  '',
  `Baseline: \`156036a\``,
  '',
  '| Check | Status | Description | Detail |',
  '| --- | --- | --- | --- |',
  ...results.map(
    (result) =>
      `| ${result.id} | ${result.status} | ${result.description.replaceAll('|', '\\|')} | ${result.detail.replaceAll('|', '\\|').replaceAll('\n', ' ')} |`,
  ),
  '',
  'The validator is read-only unless invoked with `--write`.',
  '',
].join('\n');

console.log('=== AGROSBO Phase 4-5 Pack Validation ===');
for (const result of results) {
  console.log(`${result.status === 'PASS' ? '✓' : '✗'} [${result.id}] ${result.description}`);
  if (result.status === 'FAIL') console.log(`  ${result.detail}`);
}
console.log(`Result: ${failures.length === 0 ? 'PASS' : 'FAIL'}`);

if (writeReport) {
  writeFileSync(REPORT_PATH, report, 'utf8');
  console.log(`Report written: ${relative(REPO_ROOT, REPORT_PATH)}`);
} else {
  console.log('Read-only mode: validation-report.md was not written');
}

process.exitCode = failures.length === 0 ? 0 : 1;
