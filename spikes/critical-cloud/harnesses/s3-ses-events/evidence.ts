/**
 * S3 Harness -- Execution Evidence
 *
 * DISPOSABLE -- not production code.
 */

import type { ExecutionEvidence, HarnessConfig, TestCaseResult, CleanupStep } from './types.js';

const HARNESS_VERSION = '0.1.0-t09';

export function buildEvidence(
  config: HarnessConfig,
  results: TestCaseResult[],
  stats: { correlations: number; duplicates: number; outOfOrder: number },
  errors: string[],
  cleanupPlan: CleanupStep[],
): ExecutionEvidence {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  let verdict: ExecutionEvidence['verdict'];
  if (failed === 0) verdict = 'PASS';
  else if (passed > 0) verdict = 'PARTIAL';
  else verdict = 'FAIL';

  return {
    harnessVersion: HARNESS_VERSION,
    timestamp: new Date().toISOString(),
    dryRun: config.dryRun,
    region: config.region,
    configurationSet: config.configurationSet,
    rule: config.eventBridgeRule,
    queue: config.sqsQueueName,
    casesExecuted: results.length,
    results,
    correlations: stats.correlations,
    duplicatesHandled: stats.duplicates,
    outOfOrderHandled: stats.outOfOrder,
    sanitizedErrors: errors,
    cleanupPlan,
    zeroAwsCalls: config.dryRun,
    verdict,
  };
}

export function printEvidence(evidence: ExecutionEvidence): void {
  console.log('\n-----------------------------------------------------------');
  console.log('  EXECUTION EVIDENCE');
  console.log('-----------------------------------------------------------\n');
  console.log(`  Version:        ${evidence.harnessVersion}`);
  console.log(`  Timestamp:      ${evidence.timestamp}`);
  console.log(`  Mode:           ${evidence.dryRun ? 'dry-run' : 'live'}`);
  console.log(`  Region:         ${evidence.region}`);
  console.log(`  Config Set:     ${evidence.configurationSet}`);
  console.log(`  Rule:           ${evidence.rule}`);
  console.log(`  Queue:          ${evidence.queue}`);
  console.log(`  Cases:          ${evidence.casesExecuted}`);
  console.log(`  Correlations:   ${evidence.correlations}`);
  console.log(`  Duplicates:     ${evidence.duplicatesHandled}`);
  console.log(`  Out-of-order:   ${evidence.outOfOrderHandled}`);
  console.log(`  Zero AWS:       ${evidence.zeroAwsCalls}`);
  console.log(`  Verdict:        ${evidence.verdict}`);
  if (evidence.cleanupPlan.length > 0) {
    console.log('\n  Cleanup Plan:');
    for (const step of evidence.cleanupPlan) {
      console.log(`    ${step.order}. [${step.service}] ${step.action} -> ${step.resource}`);
    }
  }
}
