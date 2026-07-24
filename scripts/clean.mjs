#!/usr/bin/env node
// Cross-platform clean: removes regenerable build artifacts without depending
// on shell-specific commands or extra packages. Uses Node fs only.
//
// Usage:
//   node scripts/clean.mjs            # clean the whole monorepo
//   node scripts/clean.mjs web api    # clean only the given workspace dirs
import { rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Directories (relative to repo root) whose build artifacts we remove.
const workspaceDirs = ['.', 'web', 'api', 'infra', 'shared'];
const artifactDirNames = ['dist', 'coverage', 'cdk.out', '.build'];

const args = process.argv.slice(2);
const scopes = args.length > 0 ? args : workspaceDirs;

let removed = 0;

function rm(target) {
  try {
    rmSync(target, { recursive: true, force: true });
    removed++;
  } catch {
    /* ignore */
  }
}

for (const scope of scopes) {
  const base = join(repoRoot, scope);
  for (const name of artifactDirNames) {
    rm(join(base, name));
  }
  // Remove *.tsbuildinfo files directly under the scope dir.
  try {
    for (const entry of readdirSync(base)) {
      if (entry.endsWith('.tsbuildinfo')) {
        const p = join(base, entry);
        if (statSync(p).isFile()) rm(p);
      }
    }
  } catch {
    /* scope dir may not exist */
  }
}

console.log(`clean: removed ${removed} build artifact target(s).`);
