/**
 * S2 Harness -- Execution Evidence
 *
 * Produces structured, reproducible evidence of harness execution.
 * DISPOSABLE -- not production code.
 */

import type {
  ExecutionEvidence,
  HarnessConfig,
  TestCaseResult,
  AggregateMetrics,
} from './types.js';

const HARNESS_VERSION = '0.1.0-t08';

export function buildEvidence(
  config: HarnessConfig,
  results: TestCaseResult[],
  aggregate: AggregateMetrics | undefined,
  errors: string[],
): ExecutionEvidence {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  let verdict: ExecutionEvidence['verdict'];
  if (failed === 0) {
    verdict = 'PASS';
  } else if (passed > 0) {
    verdict = 'PARTIAL';
  } else {
    verdict = 'FAIL';
  }

  return {
    timestamp: new Date().toISOString(),
    harnessVersion: HARNESS_VERSION,
    mode: config.dryRun ? 'dry-run' : 'live',
    region: config.region,
    languageCandidates: config.languageCandidates,
    casesExecuted: results.length,
    results,
    aggregateMetrics: aggregate,
    sanitizedErrors: errors,
    zeroAwsCalls: config.dryRun,
    verdict,
  };
}

export function printEvidence(evidence: ExecutionEvidence): void {
  console.log('\n-----------------------------------------------------------');
  console.log('  EXECUTION EVIDENCE');
  console.log('-----------------------------------------------------------\n');
  console.log(`  Timestamp:    ${evidence.timestamp}`);
  console.log(`  Version:      ${evidence.harnessVersion}`);
  console.log(`  Mode:         ${evidence.mode}`);
  console.log(`  Region:       ${evidence.region}`);
  console.log(`  Locales:      ${evidence.languageCandidates.join(', ')}`);
  console.log(`  Cases:        ${evidence.casesExecuted}`);
  console.log(`  Zero AWS:     ${evidence.zeroAwsCalls}`);
  console.log(`  Verdict:      ${evidence.verdict}`);

  if (evidence.aggregateMetrics) {
    const m = evidence.aggregateMetrics;
    console.log('\n  Aggregate Metrics:');
    console.log(`    Avg WER:            ${(m.averageWer * 100).toFixed(1)}%`);
    console.log(`    Critical terms:     ${m.criticalTermCoverage.toFixed(1)}%`);
    console.log(`    Number accuracy:    ${m.numberAccuracy.toFixed(1)}%`);
    console.log(`    Unit accuracy:      ${m.unitAccuracy.toFixed(1)}%`);
    console.log(`    Temporal accuracy:  ${m.temporalAccuracy.toFixed(1)}%`);
  }

  if (evidence.sanitizedErrors.length > 0) {
    console.log('\n  Sanitized Errors:');
    for (const e of evidence.sanitizedErrors) {
      console.log(`    - ${e}`);
    }
  }
}
