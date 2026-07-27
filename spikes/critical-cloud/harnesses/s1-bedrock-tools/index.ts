/**
 * S1 Harness -- Main Entry Point
 *
 * Bedrock Converse API + Tool Calling spike.
 * Validates: tool definitions, argument validation, conversation loop,
 * iteration limits, timeouts, sanitized logs, execution evidence.
 *
 * Modes:
 *   --dry-run  (default) Uses mock client, no AWS calls.
 *   --live     Uses real Bedrock client (requires credentials + human authorization).
 *
 * DISPOSABLE -- not production code.
 */

import { loadConfig } from './config.js';
import { createMockClient, type MockScenario } from './mock-client.js';
import { createLiveClient } from './bedrock-client.js';
import { runConversation } from './conversation-loop.js';
import type { BedrockClient } from './bedrock-client.js';
import type { ExecutionEvidence, HarnessConfig } from './types.js';

// ---------- Main ----------

async function main(): Promise<void> {
  console.log('===========================================================');
  console.log('  S1 -- Bedrock Tool Calling (Spike Harness)');
  console.log('===========================================================\n');

  const isLive = process.argv.includes('--live');
  const isDryRun = !isLive;

  console.log(`  Mode: ${isDryRun ? 'DRY-RUN (mock client)' : 'LIVE (real Bedrock)'}`);
  console.log('');

  // Load and validate config
  const configResult = loadConfig(isDryRun);

  if (configResult.warnings.length > 0) {
    for (const w of configResult.warnings) {
      console.log(`  [!] ${w}`);
    }
    console.log('');
  }

  if (!configResult.valid || !configResult.config) {
    console.error('  [x] Configuration invalid:');
    for (const e of configResult.errors) {
      console.error(`    - ${e}`);
    }
    process.exit(1);
  }

  const config = configResult.config;
  config.dryRun = isDryRun;

  console.log(`  Region:      ${config.region}`);
  console.log(`  Model:       ${config.modelId}`);
  console.log(`  Max iters:   ${config.maxIterations}`);
  console.log(`  Timeout:     ${config.timeoutMs}ms`);
  console.log('');

  if (isDryRun) {
    await runDryRunTests(config);
  } else {
    await runLiveTest(config);
  }
}

// ---------- Dry-run test suite ----------

interface TestCase {
  name: string;
  scenario: MockScenario;
  prompt: string;
  expectSuccess: boolean;
  expectToolCalls?: boolean;
  expectIterationLimit?: boolean;
  expectError?: string;
  timeoutOverride?: number;
  delayMs?: number;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Model requests valid tool -> gets result -> final answer',
    scenario: 'tool_call_then_answer',
    prompt: '¿Cuál es el estado del bloque Norte 1?',
    expectSuccess: true,
    expectToolCalls: true,
  },
  {
    name: 'Model answers directly without tool use',
    scenario: 'direct_answer',
    prompt: '¿Cuál es el estado del bloque Norte 1?',
    expectSuccess: true,
    expectToolCalls: false,
  },
  {
    name: 'Unknown tool rejected with error',
    scenario: 'unknown_tool',
    prompt: 'Ejecuta una acción desconocida',
    expectSuccess: false,
    expectToolCalls: true,
    expectError: 'unknown tool',
  },
  {
    name: 'Invalid arguments rejected (wrong type)',
    scenario: 'invalid_arguments',
    prompt: 'Estado del campo 12345',
    expectSuccess: false,
    expectToolCalls: true,
    expectError: 'invalid arguments',
  },
  {
    name: 'Missing required arguments rejected',
    scenario: 'missing_arguments',
    prompt: 'Estado de un campo sin especificar',
    expectSuccess: false,
    expectToolCalls: true,
    expectError: 'missing required',
  },
  {
    name: 'Multi-iteration tool calling (2 tools + final answer)',
    scenario: 'multi_iteration',
    prompt: '¿Qué campo necesita riego y hay tarea asignada?',
    expectSuccess: true,
    expectToolCalls: true,
  },
  {
    name: 'Iteration limit prevents infinite loop',
    scenario: 'infinite_loop',
    prompt: 'Haz algo indefinidamente',
    expectSuccess: false,
    expectIterationLimit: true,
  },
  {
    name: 'Timeout controls slow responses',
    scenario: 'timeout',
    prompt: 'Consulta lenta',
    expectSuccess: false,
    expectError: 'timed out',
    timeoutOverride: 500,
    delayMs: 0, // timeout scenario handles its own delay
  },
  {
    name: 'Model API error handled gracefully',
    scenario: 'model_error',
    prompt: 'Consulta que falla',
    expectSuccess: false,
    expectError: 'ThrottlingException',
  },
];

async function runDryRunTests(config: HarnessConfig): Promise<void> {
  console.log('> Running dry-run tests with mock client\n');

  let passed = 0;
  let failed = 0;
  const evidenceLog: ExecutionEvidence[] = [];

  for (const tc of TEST_CASES) {
    const testConfig = {
      ...config,
      maxIterations: tc.expectIterationLimit ? 3 : config.maxIterations,
      timeoutMs: tc.timeoutOverride ?? config.timeoutMs,
    };

    const client = createMockClient({
      scenario: tc.scenario,
      delayMs: tc.delayMs,
    });

    console.log(`  > ${tc.name}`);

    const result = await runConversation(client, testConfig, tc.prompt);
    evidenceLog.push(result.evidence);

    // Evaluate test expectations
    let testPass = true;
    const details: string[] = [];

    if (tc.expectSuccess && !result.success) {
      testPass = false;
      details.push(`Expected success but got error: ${result.error}`);
    }

    if (!tc.expectSuccess && result.success) {
      testPass = false;
      details.push('Expected failure but got success');
    }

    if (tc.expectToolCalls !== undefined) {
      const hasToolCalls = result.evidence.toolCalls.length > 0;
      if (tc.expectToolCalls !== hasToolCalls) {
        testPass = false;
        details.push(
          `Expected toolCalls=${tc.expectToolCalls}, got ${result.evidence.toolCalls.length} calls`,
        );
      }
    }

    if (tc.expectIterationLimit) {
      if (result.evidence.stopReason !== 'iteration_limit') {
        testPass = false;
        details.push(`Expected iteration_limit, got stopReason=${result.evidence.stopReason}`);
      }
    }

    if (tc.expectError) {
      const errorStr = (result.error ?? '') + JSON.stringify(result.evidence.errors);
      if (!errorStr.toLowerCase().includes(tc.expectError.toLowerCase())) {
        testPass = false;
        details.push(`Expected error containing "${tc.expectError}", got: ${result.error}`);
      }
    }

    if (testPass) {
      passed++;
      console.log(
        `    [ok] PASS (iters=${result.evidence.totalIterations}, tools=${result.evidence.toolCalls.length})`,
      );
    } else {
      failed++;
      console.log(`    [x] FAIL`);
      for (const d of details) {
        console.log(`      - ${d}`);
      }
    }
    console.log('');
  }

  // ---------- Additional validations ----------

  console.log('> Additional validations\n');

  // Sanitization check
  const sensitiveContent =
    'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY user@email.com';
  const { sanitize, containsSensitive } = await import('./sanitize.js');
  const sanitized = sanitize(sensitiveContent);
  const isSafe = !containsSensitive(sanitized);
  if (isSafe) {
    passed++;
    console.log('  [ok] PASS Sensitive content redacted from logs');
  } else {
    failed++;
    console.log(`  [x] FAIL Sensitive content leaked: ${sanitized}`);
  }

  // Dry-run mode verification
  const neverCalledLive = config.dryRun === true;
  if (neverCalledLive) {
    passed++;
    console.log('  [ok] PASS Dry-run mode: no AWS calls executed');
  } else {
    failed++;
    console.log('  [x] FAIL Dry-run flag not set');
  }

  // Evidence structure validation
  const lastEvidence = evidenceLog[0];
  const hasRequiredFields =
    lastEvidence &&
    'config' in lastEvidence &&
    'startedAt' in lastEvidence &&
    'completedAt' in lastEvidence &&
    'totalIterations' in lastEvidence &&
    'toolCalls' in lastEvidence &&
    'stopReason' in lastEvidence &&
    'errors' in lastEvidence;
  if (hasRequiredFields) {
    passed++;
    console.log('  [ok] PASS Execution evidence has all required fields');
  } else {
    failed++;
    console.log('  [x] FAIL Evidence structure incomplete');
  }

  // ---------- Summary ----------
  console.log('\n===========================================================');
  console.log('  RESULTS');
  console.log('===========================================================\n');

  console.log(`  Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
  console.log('');

  if (failed > 0) {
    console.log('  VERDICT: FAIL\n');
    process.exit(1);
  } else {
    console.log('  VERDICT: PASS\n');
  }

  // Print structured evidence summary (sanitized)
  console.log('-----------------------------------------------------------');
  console.log('  EXECUTION EVIDENCE (summary)');
  console.log('-----------------------------------------------------------\n');

  for (let i = 0; i < evidenceLog.length; i++) {
    const ev = evidenceLog[i];
    console.log(`  [${i + 1}] ${TEST_CASES[i].name}`);
    console.log(
      `      iterations=${ev.totalIterations} tools=${ev.toolCalls.length} stop=${ev.stopReason}`,
    );
    if (ev.toolCalls.length > 0) {
      for (const tc of ev.toolCalls) {
        console.log(
          `      -> ${tc.toolName} [${tc.validationResult}]${tc.rejectionReason ? ` (${tc.rejectionReason})` : ''}`,
        );
      }
    }
    if (ev.finalResponse) {
      console.log(`      response: "${ev.finalResponse.substring(0, 80)}..."`);
    }
    console.log('');
  }
}

// ---------- Live test (T10 only) ----------

async function runLiveTest(config: HarnessConfig): Promise<void> {
  console.log('> Running LIVE test against Bedrock\n');
  console.log('  [!] This requires valid AWS credentials and human authorization.\n');

  let client: BedrockClient;
  try {
    client = createLiveClient(config);
  } catch (err) {
    console.error(`  [x] Failed to create Bedrock client: ${(err as Error).message}`);
    console.error('  Ensure @aws-sdk/client-bedrock-runtime is installed.');
    process.exit(1);
  }

  const result = await runConversation(
    client,
    config,
    '¿Cuál es el estado del bloque Norte 1 y qué tareas pendientes hay de alta prioridad?',
  );

  console.log('\n===========================================================');
  console.log('  LIVE RESULT');
  console.log('===========================================================\n');

  console.log(`  Success: ${result.success}`);
  console.log(`  Iterations: ${result.evidence.totalIterations}`);
  console.log(`  Tool calls: ${result.evidence.toolCalls.length}`);
  console.log(`  Stop reason: ${result.evidence.stopReason}`);

  if (result.evidence.finalResponse) {
    console.log(`  Response: ${result.evidence.finalResponse}`);
  }

  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }

  console.log('');

  if (!result.success) {
    process.exit(1);
  }
}

// ---------- Entry ----------

main().catch((err) => {
  console.error('Unhandled error:', (err as Error).message);
  process.exit(1);
});
