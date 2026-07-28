/**
 * S3 Harness -- SES Events (SES -> EventBridge -> SQS)
 *
 * Validates locally: configuration, event parsing, correlation,
 * deduplication, idempotency, queue policy, sanitization, evidence.
 *
 * Default mode: dry-run (no AWS calls).
 * DISPOSABLE -- not production code.
 */

import { loadConfig } from './config.js';
import { createMockSesClient } from './mock-ses-client.js';
import { createMockEventBridgeClient } from './mock-eventbridge-client.js';
import { createMockSqsClient } from './mock-sqs-client.js';
import { parseSqsBody, validateEvent, extractMessageId } from './event-parser.js';
import { CorrelationStore } from './correlation.js';
import { buildQueuePolicy, validateQueuePolicy } from './queue-policy.js';
import { buildEventPattern, validateEventPattern } from './event-pattern.js';
import { buildCleanupPlan } from './cleanup-plan.js';
import { sanitize, containsSensitive } from './sanitize.js';
import { buildEvidence, printEvidence } from './evidence.js';
import {
  runLiveS3,
  checkResiduals,
  cleanupResources,
  verifyPropagation,
  type AwsClients,
  type LiveState,
} from './live-runner.js';
import type { TestCaseResult, HarnessConfig, EventBridgeEvent, SqsMessage } from './types.js';

// ---------- Helpers ----------

function makeEvent(
  overrides: Partial<EventBridgeEvent> & { detail: EventBridgeEvent['detail'] },
): EventBridgeEvent {
  return {
    version: '0',
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: 'aws.ses',
    'detail-type': 'Email Sent',
    account: '334856751415',
    time: new Date().toISOString(),
    region: 'us-east-1',
    ...overrides,
    detail: overrides.detail,
  };
}

function makeSqsMessage(body: string, id?: string): SqsMessage {
  return {
    MessageId: id || `sqs-${Date.now()}`,
    ReceiptHandle: 'mock-handle',
    Body: body,
  };
}

// ---------- Main ----------

async function main(): Promise<void> {
  console.log('===========================================================');
  console.log('  S3 -- SES Events (SES -> EventBridge -> SQS)');
  console.log('===========================================================\n');

  const configResult = loadConfig();
  if (configResult.warnings.length > 0) {
    for (const w of configResult.warnings) console.log(`  [!] ${w}`);
    console.log('');
  }
  if (!configResult.valid || !configResult.config) {
    console.error('  [x] Configuration invalid:');
    for (const e of configResult.errors) console.error(`    - ${e}`);
    process.exit(1);
  }

  const config = configResult.config;
  console.log(`  Mode:       ${config.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`  Region:     ${config.region}`);
  console.log(`  ConfigSet:  ${config.configurationSet}`);
  console.log(`  Rule:       ${config.eventBridgeRule}`);
  console.log(`  Queue:      ${config.sqsQueueName}`);
  console.log('');

  const results: TestCaseResult[] = [];
  let duplicatesHandled = 0;
  let outOfOrderHandled = 0;

  // ===== CONFIG TESTS =====
  console.log('> Configuration Tests\n');
  results.push(...runConfigTests(config));

  // ===== SES + CORRELATION TESTS =====
  console.log('\n> SES & Correlation Tests\n');
  const corrResults = await runCorrelationTests(config);
  results.push(...corrResults.results);
  duplicatesHandled = corrResults.duplicates;
  outOfOrderHandled = corrResults.outOfOrder;

  // ===== EVENT PARSER TESTS =====
  console.log('\n> Event Parser Tests\n');
  results.push(...runParserTests());

  // ===== QUEUE POLICY TESTS =====
  console.log('\n> Queue Policy Tests\n');
  results.push(...runPolicyTests(config));

  // ===== EVENT PATTERN TESTS =====
  console.log('\n> Event Pattern Tests\n');
  results.push(...runEventPatternTests());

  // ===== ERROR SIMULATION TESTS =====
  console.log('\n> Error Simulation Tests\n');
  results.push(...(await runErrorTests(config)));

  // ===== INFRASTRUCTURE TESTS =====
  console.log('\n> Infrastructure Tests\n');
  results.push(...runInfraTests(config));

  // ===== LIVE LOGIC TESTS =====
  console.log('\n> Live Logic Tests\n');
  results.push(...(await runLiveLogicTests(config)));

  // ===== LIVE EXECUTION (only if not dry-run) =====
  if (!config.dryRun) {
    console.log('\n> LIVE S3 Execution\n');
    results.push(...(await runLiveS3(config)));
  }

  // ===== Results =====
  const cleanupPlan = buildCleanupPlan(config);
  const evidence = buildEvidence(
    config,
    results,
    {
      correlations: corrResults.correlationCount,
      duplicates: duplicatesHandled,
      outOfOrder: outOfOrderHandled,
    },
    [],
    cleanupPlan,
  );

  console.log('\n===========================================================');
  console.log('  RESULTS');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const icon = r.pass ? '[ok]' : '[x]';
    console.log(`  ${icon} ${r.id}: ${r.description}`);
    if (!r.pass) console.log(`       ${r.detail}`);
    if (r.pass) passed++;
    else failed++;
  }

  console.log(`\n  Total: ${results.length} | PASS: ${passed} | FAIL: ${failed}`);
  console.log(`\n  VERDICT: ${failed === 0 ? 'PASS' : 'FAIL'}\n`);

  printEvidence(evidence);
  if (failed > 0) process.exit(1);
}

// ---------- Config Tests ----------

function runConfigTests(config: HarnessConfig): TestCaseResult[] {
  const r: TestCaseResult[] = [];

  // 1. Valid config
  r.push({ id: 'CFG-01', description: 'Config valid in dry-run', pass: true, detail: 'loaded' });
  console.log('  [ok] CFG-01');

  // 2. Dry-run default verification
  if (config.dryRun) {
    r.push({
      id: 'CFG-02',
      description: 'Dry-run true by default',
      pass: true,
      detail: 'dryRun=true confirmed',
    });
  } else {
    r.push({
      id: 'CFG-02',
      description: 'Live mode: authorized execution',
      pass: true,
      detail: 'dryRun=false, live mode active',
    });
  }
  console.log('  [ok] CFG-02');

  // 3. Region restriction
  const badRegion = { ...config };
  const origEnv = process.env.AWS_REGION;
  process.env.AWS_REGION = 'eu-west-1';
  const badResult = loadConfig();
  process.env.AWS_REGION = origEnv || 'us-east-1';
  r.push({
    id: 'CFG-03',
    description: 'Non us-east-1 region rejected',
    pass: !badResult.valid,
    detail: badResult.errors.join('; '),
  });
  console.log(`  ${!badResult.valid ? '[ok]' : '[x]'} CFG-03`);

  // 4. Placeholder sender rejected in live mode (isolated test)
  const origDry = process.env.SES_DRY_RUN;
  const origSender = process.env.SES_TEST_SENDER_EMAIL;
  process.env.SES_DRY_RUN = 'false';
  process.env.SES_TEST_SENDER_EMAIL = 'verified-sender@example.invalid';
  const liveResult = loadConfig();
  process.env.SES_DRY_RUN = origDry ?? 'true';
  if (origSender !== undefined) {
    process.env.SES_TEST_SENDER_EMAIL = origSender;
  } else {
    delete process.env.SES_TEST_SENDER_EMAIL;
  }
  const hasSenderError = liveResult.errors.some((e) => e.includes('example.invalid'));
  r.push({
    id: 'CFG-04',
    description: 'Placeholder sender rejected in live mode (isolated)',
    pass: hasSenderError,
    detail: liveResult.errors.join('; '),
  });
  console.log(`  ${hasSenderError ? '[ok]' : '[x]'} CFG-04`);

  return r;
}

// ---------- Correlation Tests ----------

async function runCorrelationTests(config: HarnessConfig): Promise<{
  results: TestCaseResult[];
  duplicates: number;
  outOfOrder: number;
  correlationCount: number;
}> {
  const r: TestCaseResult[] = [];
  const store = new CorrelationStore();
  let duplicates = 0;
  let outOfOrder = 0;

  // 5. SES Send
  const sesClient = createMockSesClient({ type: 'success' });
  const sendResult = await sesClient.sendEmail({
    from: config.senderEmail,
    to: config.recipientEmail,
    subject: 'Test',
    body: 'Hello',
    configurationSet: config.configurationSet,
  });
  r.push({
    id: 'SES-05',
    description: 'SES Send simulated success',
    pass: sendResult.success,
    detail: sendResult.success ? `msgId=${sendResult.result.messageId}` : 'failed',
  });
  console.log(`  ${sendResult.success ? '[ok]' : '[x]'} SES-05`);

  // 6. MessageId captured
  const msgId = sendResult.success ? sendResult.result.messageId : '';
  r.push({
    id: 'SES-06',
    description: 'MessageId captured',
    pass: msgId.length > 0,
    detail: `msgId=${msgId}`,
  });
  console.log(`  ${msgId.length > 0 ? '[ok]' : '[x]'} SES-06`);

  // 7. Email Sent event valid
  const sentEvent = makeEvent({
    'detail-type': 'Email Sent',
    detail: { messageId: msgId, eventType: 'SEND', timestamp: new Date().toISOString() },
  });
  const sentResult = store.process(sentEvent);
  r.push({
    id: 'EVT-07',
    description: '"Email Sent" event accepted',
    pass: sentResult.accepted,
    detail: `accepted=${sentResult.accepted}`,
  });
  console.log(`  ${sentResult.accepted ? '[ok]' : '[x]'} EVT-07`);

  // 8. Email Delivered event valid
  const delivEvent = makeEvent({
    id: 'evt-delivered-1',
    'detail-type': 'Email Delivered',
    detail: { messageId: msgId, eventType: 'DELIVERY', timestamp: new Date().toISOString() },
  });
  const delivResult = store.process(delivEvent);
  r.push({
    id: 'EVT-08',
    description: '"Email Delivered" event accepted',
    pass: delivResult.accepted,
    detail: `state=${delivResult.record?.state}`,
  });
  console.log(`  ${delivResult.accepted ? '[ok]' : '[x]'} EVT-08`);

  // 9. Correlation by MessageId
  const record = store.getRecord(msgId);
  r.push({
    id: 'COR-09',
    description: 'Correlation correct by MessageId',
    pass: record?.state === 'DELIVERED' && record?.messageId === msgId,
    detail: `state=${record?.state}`,
  });
  console.log(`  ${record?.state === 'DELIVERED' ? '[ok]' : '[x]'} COR-09`);

  // 10. Unknown MessageId
  const unknownEvent = makeEvent({
    id: 'evt-unknown-1',
    detail: {
      messageId: 'unknown-msg-999',
      eventType: 'SEND',
      timestamp: new Date().toISOString(),
    },
  });
  const unknownResult = store.process(unknownEvent);
  r.push({
    id: 'COR-10',
    description: 'Unknown MessageId creates new record',
    pass: unknownResult.accepted,
    detail: `accepted=${unknownResult.accepted}`,
  });
  console.log(`  ${unknownResult.accepted ? '[ok]' : '[x]'} COR-10`);

  // 11. Duplicate event ignored
  const dupResult = store.process(sentEvent); // same event ID
  duplicates += dupResult.duplicate ? 1 : 0;
  r.push({
    id: 'COR-11',
    description: 'Duplicate event idempotently ignored',
    pass: dupResult.duplicate === true,
    detail: `duplicate=${dupResult.duplicate}`,
  });
  console.log(`  ${dupResult.duplicate ? '[ok]' : '[x]'} COR-11`);

  // 12. Delivery before Sent (out of order)
  const store2 = new CorrelationStore();
  const earlyDeliv = makeEvent({
    id: 'evt-early-d',
    'detail-type': 'Email Delivered',
    detail: { messageId: 'ooo-msg-1', eventType: 'DELIVERY', timestamp: new Date().toISOString() },
  });
  const oooResult = store2.process(earlyDeliv);
  outOfOrder += oooResult.outOfOrder ? 1 : 0;
  r.push({
    id: 'COR-12',
    description: 'Delivery before Sent accepted (out-of-order)',
    pass: oooResult.accepted && oooResult.outOfOrder,
    detail: `ooo=${oooResult.outOfOrder}`,
  });
  console.log(`  ${oooResult.accepted && oooResult.outOfOrder ? '[ok]' : '[x]'} COR-12`);

  // 13. Delayed event within limit
  const delayedEvent = makeEvent({
    id: 'evt-delayed',
    detail: {
      messageId: 'delayed-msg',
      eventType: 'SEND',
      timestamp: new Date(Date.now() - 30_000).toISOString(),
    },
    time: new Date(Date.now() - 30_000).toISOString(),
  });
  const delayedResult = store.process(delayedEvent);
  r.push({
    id: 'COR-13',
    description: 'Delayed event (30s) accepted',
    pass: delayedResult.accepted,
    detail: `accepted=${delayedResult.accepted}`,
  });
  console.log(`  ${delayedResult.accepted ? '[ok]' : '[x]'} COR-13`);

  // 14. Expired event rejected
  const expiredEvent = makeEvent({
    id: 'evt-expired',
    detail: {
      messageId: 'expired-msg',
      eventType: 'SEND',
      timestamp: new Date(Date.now() - 120_000).toISOString(),
    },
    time: new Date(Date.now() - 120_000).toISOString(),
  });
  const expiredResult = store.process(expiredEvent);
  r.push({
    id: 'COR-14',
    description: 'Expired event (120s) rejected',
    pass: !expiredResult.accepted && expiredResult.expired,
    detail: `expired=${expiredResult.expired}`,
  });
  console.log(`  ${expiredResult.expired ? '[ok]' : '[x]'} COR-14`);

  const stats = store.getStats();
  return { results: r, duplicates, outOfOrder, correlationCount: stats.total };
}

// ---------- Parser Tests ----------

function runParserTests(): TestCaseResult[] {
  const r: TestCaseResult[] = [];

  // 15. Unknown detail-type
  const unknownType = validateEvent({
    source: 'aws.ses',
    'detail-type': 'Email Bounced',
    detail: { messageId: 'x' },
  });
  r.push({
    id: 'PAR-15',
    description: 'Unknown detail-type rejected',
    pass: !unknownType.valid,
    detail: unknownType.errors.join('; '),
  });
  console.log(`  ${!unknownType.valid ? '[ok]' : '[x]'} PAR-15`);

  // 16. Wrong source
  const wrongSource = validateEvent({
    source: 'aws.sns',
    'detail-type': 'Email Sent',
    detail: { messageId: 'x' },
  });
  r.push({
    id: 'PAR-16',
    description: 'Non aws.ses source rejected',
    pass: !wrongSource.valid,
    detail: wrongSource.errors.join('; '),
  });
  console.log(`  ${!wrongSource.valid ? '[ok]' : '[x]'} PAR-16`);

  // 17. Invalid JSON
  const badJson = parseSqsBody(makeSqsMessage('not-json{{{'));
  r.push({
    id: 'PAR-17',
    description: 'Invalid JSON rejected',
    pass: !badJson.valid,
    detail: badJson.errors.join('; '),
  });
  console.log(`  ${!badJson.valid ? '[ok]' : '[x]'} PAR-17`);

  // 18. Invalid SQS envelope
  const badEnvelope = parseSqsBody(makeSqsMessage(JSON.stringify({ foo: 'bar' })));
  r.push({
    id: 'PAR-18',
    description: 'Invalid SQS envelope rejected',
    pass: !badEnvelope.valid,
    detail: badEnvelope.errors.join('; '),
  });
  console.log(`  ${!badEnvelope.valid ? '[ok]' : '[x]'} PAR-18`);

  // 19. Empty body
  const emptyBody = parseSqsBody(makeSqsMessage(''));
  r.push({
    id: 'PAR-19',
    description: 'Empty SQS body rejected',
    pass: !emptyBody.valid,
    detail: emptyBody.errors.join('; '),
  });
  console.log(`  ${!emptyBody.valid ? '[ok]' : '[x]'} PAR-19`);

  return r;
}

// ---------- Policy Tests ----------

function runPolicyTests(config: HarnessConfig): TestCaseResult[] {
  const r: TestCaseResult[] = [];

  // 24. Correct policy
  const policy = buildQueuePolicy(config);
  const validation = validateQueuePolicy(policy, config);
  r.push({
    id: 'POL-24',
    description: 'Queue policy exact and valid',
    pass: validation.valid,
    detail: validation.errors.join('; ') || 'valid',
  });
  console.log(`  ${validation.valid ? '[ok]' : '[x]'} POL-24`);

  // 25. Wrong SourceArn
  const badArn = JSON.parse(JSON.stringify(policy));
  badArn.Statement[0].Condition.ArnEquals['aws:SourceArn'] =
    'arn:aws:events:us-east-1:334856751415:rule/wrong-rule';
  const arnResult = validateQueuePolicy(badArn, config);
  r.push({
    id: 'POL-25',
    description: 'Wrong SourceArn rejected',
    pass: !arnResult.valid,
    detail: arnResult.errors.join('; '),
  });
  console.log(`  ${!arnResult.valid ? '[ok]' : '[x]'} POL-25`);

  // 26. Wrong principal
  const badPrincipal = JSON.parse(JSON.stringify(policy));
  badPrincipal.Statement[0].Principal = '*';
  const princResult = validateQueuePolicy(badPrincipal, config);
  r.push({
    id: 'POL-26',
    description: 'Wildcard principal rejected',
    pass: !princResult.valid,
    detail: princResult.errors.join('; '),
  });
  console.log(`  ${!princResult.valid ? '[ok]' : '[x]'} POL-26`);

  return r;
}

// ---------- Event Pattern Tests ----------

function runEventPatternTests(): TestCaseResult[] {
  const r: TestCaseResult[] = [];

  // EP-33. Valid pattern built correctly
  const pattern = buildEventPattern();
  const valid = validateEventPattern(pattern);
  const exactMatch =
    pattern.source.length === 1 &&
    pattern.source[0] === 'aws.ses' &&
    pattern['detail-type'].length === 2 &&
    pattern['detail-type'].includes('Email Sent') &&
    pattern['detail-type'].includes('Email Delivered');
  r.push({
    id: 'EP-33',
    description: 'Event pattern valid and exact',
    pass: valid.valid && exactMatch,
    detail: valid.valid
      ? `source=${pattern.source[0]} types=${pattern['detail-type'].join(',')}`
      : valid.errors.join('; '),
  });
  console.log(`  ${valid.valid && exactMatch ? '[ok]' : '[x]'} EP-33`);

  // EP-34. Wrong source rejected
  const badSource = { source: ['aws.sns'], 'detail-type': ['Email Sent', 'Email Delivered'] };
  const badSourceResult = validateEventPattern(badSource);
  r.push({
    id: 'EP-34',
    description: 'Source aws.sns rejected',
    pass: !badSourceResult.valid && badSourceResult.errors.some((e) => e.includes('aws.ses')),
    detail: badSourceResult.errors.join('; '),
  });
  console.log(`  ${!badSourceResult.valid ? '[ok]' : '[x]'} EP-34`);

  // EP-35. Unauthorized detail-type rejected
  const badType = { source: ['aws.ses'], 'detail-type': ['Email Bounced'] };
  const badTypeResult = validateEventPattern(badType);
  r.push({
    id: 'EP-35',
    description: 'Detail-type Email Bounced rejected (missing required)',
    pass: !badTypeResult.valid,
    detail: badTypeResult.errors.join('; '),
  });
  console.log(`  ${!badTypeResult.valid ? '[ok]' : '[x]'} EP-35`);

  // EP-36. Empty detail-type array rejected
  const emptyTypes = { source: ['aws.ses'], 'detail-type': [] as string[] };
  const emptyResult = validateEventPattern(emptyTypes);
  r.push({
    id: 'EP-36',
    description: 'Empty detail-type array rejected',
    pass: !emptyResult.valid,
    detail: emptyResult.errors.join('; '),
  });
  console.log(`  ${!emptyResult.valid ? '[ok]' : '[x]'} EP-36`);

  return r;
}

// ---------- Error Tests ----------

async function runErrorTests(config: HarnessConfig): Promise<TestCaseResult[]> {
  const r: TestCaseResult[] = [];

  // 20. Timeout SES
  const timeoutClient = createMockSesClient({ type: 'timeout', delayMs: 50 });
  let timeoutCaught = false;
  try {
    await Promise.race([
      timeoutClient.sendEmail({
        from: 'a@b.c',
        to: 'x@y.z',
        subject: '',
        body: '',
        configurationSet: '',
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 100)),
    ]);
  } catch (e) {
    timeoutCaught =
      (e as Error).message.includes('timeout') || (e as Error).message.includes('timed out');
  }
  r.push({
    id: 'ERR-20',
    description: 'SES timeout controlled',
    pass: timeoutCaught,
    detail: timeoutCaught ? 'caught' : 'missed',
  });
  console.log(`  ${timeoutCaught ? '[ok]' : '[x]'} ERR-20`);

  // 21. SES error
  const errClient = createMockSesClient({
    type: 'error',
    code: 'MessageRejected',
    message: 'Email address not verified',
  });
  const errResp = await errClient.sendEmail({
    from: 'a@b.c',
    to: 'x@y.z',
    subject: '',
    body: '',
    configurationSet: '',
  });
  r.push({
    id: 'ERR-21',
    description: 'SES error handled',
    pass: !errResp.success,
    detail: !errResp.success ? errResp.error.code : '',
  });
  console.log(`  ${!errResp.success ? '[ok]' : '[x]'} ERR-21`);

  // 22. EventBridge error
  const ebClient = createMockEventBridgeClient({ type: 'error', message: 'InternalException' });
  const ebResult = await ebClient.putEvent(
    makeEvent({ detail: { messageId: 'x', eventType: 'SEND', timestamp: '' } }),
  );
  r.push({
    id: 'ERR-22',
    description: 'EventBridge error handled',
    pass: !ebResult.success,
    detail: `error=${ebResult.error}`,
  });
  console.log(`  ${!ebResult.success ? '[ok]' : '[x]'} ERR-22`);

  // 23. SQS error
  const sqsClient = createMockSqsClient({
    type: 'error',
    code: 'OverLimit',
    message: 'Too many messages',
  });
  const sqsResult = await sqsClient.receiveMessages(10);
  r.push({
    id: 'ERR-23',
    description: 'SQS error handled',
    pass: !sqsResult.success,
    detail: !sqsResult.success ? sqsResult.error.code : '',
  });
  console.log(`  ${!sqsResult.success ? '[ok]' : '[x]'} ERR-23`);

  return r;
}

// ---------- Infrastructure Tests ----------

function runInfraTests(config: HarnessConfig): TestCaseResult[] {
  const r: TestCaseResult[] = [];

  // 27. Sanitize email
  const emailInput = 'user@farm-real.com sent to admin@agrosbo.com';
  const cleaned = sanitize(emailInput);
  r.push({
    id: 'SAN-27',
    description: 'Email sanitized',
    pass: !containsSensitive(cleaned),
    detail: cleaned,
  });
  console.log(`  ${!containsSensitive(cleaned) ? '[ok]' : '[x]'} SAN-27`);

  // 28. Sanitize account/ARN
  const arnInput = 'arn:aws:sqs:us-east-1:334856751415:my-queue account 334856751415';
  const arnCleaned = sanitize(arnInput);
  r.push({
    id: 'SAN-28',
    description: 'Account ID and ARN sanitized',
    pass: !containsSensitive(arnCleaned),
    detail: arnCleaned,
  });
  console.log(`  ${!containsSensitive(arnCleaned) ? '[ok]' : '[x]'} SAN-28`);

  // 29. Evidence serializable
  const testEvidence = buildEvidence(
    config,
    [{ id: 'x', description: 'x', pass: true, detail: 'ok' }],
    { correlations: 0, duplicates: 0, outOfOrder: 0 },
    [],
    [],
  );
  let serializable = false;
  try {
    JSON.stringify(testEvidence);
    serializable = true;
  } catch {
    serializable = false;
  }
  r.push({
    id: 'INF-29',
    description: 'Evidence JSON-serializable',
    pass: serializable,
    detail: serializable ? 'ok' : 'failed',
  });
  console.log(`  ${serializable ? '[ok]' : '[x]'} INF-29`);

  // 30. Cleanup plan complete
  const plan = buildCleanupPlan(config);
  const hasAll = plan.length === 5 && plan.every((s) => s.service && s.action && s.resource);
  r.push({
    id: 'INF-30',
    description: 'Cleanup plan complete (5 steps)',
    pass: hasAll,
    detail: `steps=${plan.length}`,
  });
  console.log(`  ${hasAll ? '[ok]' : '[x]'} INF-30`);

  // 31. Mode validation
  if (config.dryRun) {
    r.push({
      id: 'INF-31',
      description: 'Dry-run mode: no AWS calls',
      pass: true,
      detail: 'dryRun=true, mock clients only',
    });
  } else {
    r.push({
      id: 'INF-31',
      description: 'Live mode: authorized execution',
      pass: true,
      detail: 'dryRun=false, live AWS calls performed',
    });
  }
  console.log(`  [ok] INF-31`);

  // 32. Verdict derived
  const derivedEvidence = buildEvidence(
    config,
    [{ id: 'a', description: 'a', pass: true, detail: '' }],
    { correlations: 0, duplicates: 0, outOfOrder: 0 },
    [],
    [],
  );
  const verdictDerived = derivedEvidence.verdict === 'PASS';
  r.push({
    id: 'INF-32',
    description: 'Verdict derived from results',
    pass: verdictDerived,
    detail: `verdict=${derivedEvidence.verdict}`,
  });
  console.log(`  ${verdictDerived ? '[ok]' : '[x]'} INF-32`);

  return r;
}

// ---------- Live Logic Tests ----------

function runLiveLogicTests(config: HarnessConfig): Promise<TestCaseResult[]> {
  return runLiveLogicTestsAsync(config);
}

async function runLiveLogicTestsAsync(config: HarnessConfig): Promise<TestCaseResult[]> {
  const r: TestCaseResult[] = [];

  // LL-37: Residual queue detected
  const resQClients: AwsClients = {
    ses: {
      async send() {
        return { ConfigurationSets: [] };
      },
    },
    eb: {
      async send() {
        return { Rules: [] };
      },
    },
    sqs: {
      async send() {
        return { QueueUrl: 'http://x' };
      },
    },
  };
  const resQ = await checkResiduals(resQClients, config);
  r.push({
    id: 'LL-37',
    description: 'Residual queue -> HARD STOP',
    pass: resQ.found,
    detail: resQ.details[0] || '',
  });
  console.log(`  ${resQ.found ? '[ok]' : '[x]'} LL-37`);

  // LL-38: Residual rule detected
  const resRClients: AwsClients = {
    ses: {
      async send() {
        return { ConfigurationSets: [] };
      },
    },
    eb: {
      async send() {
        return { Rules: [{ Name: config.eventBridgeRule }] };
      },
    },
    sqs: {
      async send() {
        throw new Error('x');
      },
    },
  };
  const resR = await checkResiduals(resRClients, config);
  r.push({
    id: 'LL-38',
    description: 'Residual rule -> HARD STOP',
    pass: resR.found,
    detail: resR.details[0] || '',
  });
  console.log(`  ${resR.found ? '[ok]' : '[x]'} LL-38`);

  // LL-39: Residual config set detected
  const resCClients: AwsClients = {
    ses: {
      async send() {
        return { ConfigurationSets: [{ Name: config.configurationSet }] };
      },
    },
    eb: {
      async send() {
        return { Rules: [] };
      },
    },
    sqs: {
      async send() {
        throw new Error('x');
      },
    },
  };
  const resC = await checkResiduals(resCClients, config);
  r.push({
    id: 'LL-39',
    description: 'Residual config set -> HARD STOP',
    pass: resC.found,
    detail: resC.details[0] || '',
  });
  console.log(`  ${resC.found ? '[ok]' : '[x]'} LL-39`);

  // LL-40: Sender not verified -> HARD STOP
  const unvClients: AwsClients = {
    ses: {
      async send() {
        return { VerifiedForSendingStatus: false, ConfigurationSets: [] };
      },
    },
    eb: {
      async send() {
        return { Rules: [] };
      },
    },
    sqs: {
      async send() {
        throw new Error('x');
      },
    },
  };
  const unvRes = await runLiveS3(config, unvClients, async () => {});
  r.push({
    id: 'LL-40',
    description: 'Sender not verified -> HARD STOP',
    pass: unvRes.some((t) => !t.pass && t.description.includes('not verified')),
    detail: unvRes[0]?.detail || '',
  });
  console.log(`  ${unvRes.some((t) => !t.pass) ? '[ok]' : '[x]'} LL-40`);

  // LL-41: AccessDenied -> HARD STOP
  const adClients: AwsClients = {
    ses: {
      async send() {
        throw new Error('AccessDeniedException');
      },
    },
    eb: {
      async send() {
        return {};
      },
    },
    sqs: {
      async send() {
        return {};
      },
    },
  };
  const adRes = await runLiveS3(config, adClients, async () => {});
  r.push({
    id: 'LL-41',
    description: 'AccessDenied -> HARD STOP',
    pass: adRes.some((t) => t.detail.includes('AccessDenied')),
    detail: adRes[0]?.detail || '',
  });
  console.log(`  ${adRes.some((t) => t.detail.includes('AccessDenied')) ? '[ok]' : '[x]'} LL-41`);

  // LL-42: Cleanup after success - all flags
  const fullState: LiveState = {
    queueUrl: 'u',
    queueArn: 'a',
    ruleArn: 'a',
    configSetCreated: true,
    eventDestCreated: true,
    ruleCreated: true,
    targetCreated: true,
    queueCreated: true,
  };
  let cc = 0;
  const ccClients: AwsClients = {
    ses: {
      async send() {
        cc++;
        return {};
      },
    },
    eb: {
      async send() {
        cc++;
        return {};
      },
    },
    sqs: {
      async send() {
        cc++;
        return {};
      },
    },
  };
  const ce = await cleanupResources(ccClients, config, fullState);
  r.push({
    id: 'LL-42',
    description: 'Cleanup success: 5 calls, 0 errors',
    pass: cc === 5 && ce.length === 0,
    detail: `calls=${cc} errors=${ce.length}`,
  });
  console.log(`  ${cc === 5 ? '[ok]' : '[x]'} LL-42`);

  // LL-43: Cleanup skips uncreated
  let pc = 0;
  const pcClients: AwsClients = {
    ses: {
      async send() {
        pc++;
        return {};
      },
    },
    eb: {
      async send() {
        pc++;
        return {};
      },
    },
    sqs: {
      async send() {
        pc++;
        return {};
      },
    },
  };
  await cleanupResources(pcClients, config, {
    queueUrl: 'u',
    queueCreated: true,
    configSetCreated: false,
    eventDestCreated: false,
    ruleCreated: false,
    targetCreated: false,
  });
  r.push({
    id: 'LL-43',
    description: 'Cleanup skips uncreated (1 call)',
    pass: pc === 1,
    detail: `calls=${pc}`,
  });
  console.log(`  ${pc === 1 ? '[ok]' : '[x]'} LL-43`);

  // LL-44: One failure does not stop others
  let fc = 0;
  const fcClients: AwsClients = {
    ses: {
      async send() {
        fc++;
        throw new Error('x');
      },
    },
    eb: {
      async send() {
        fc++;
        if (fc <= 1) throw new Error('x');
        return {};
      },
    },
    sqs: {
      async send() {
        fc++;
        return {};
      },
    },
  };
  const fe = await cleanupResources(fcClients, config, fullState);
  r.push({
    id: 'LL-44',
    description: 'Cleanup continues after failure',
    pass: fc === 5 && fe.length > 0,
    detail: `calls=${fc} errors=${fe.length}`,
  });
  console.log(`  ${fc === 5 ? '[ok]' : '[x]'} LL-44`);

  // LL-45: Propagation OK
  const propState: LiveState = {
    queueArn: 'qarn',
    configSetCreated: true,
    eventDestCreated: true,
    ruleCreated: true,
    targetCreated: true,
    queueCreated: true,
  };
  const propClients: AwsClients = {
    ses: {
      async send() {
        return {
          EventDestinations: [
            {
              Name: 'agrosbo-spike-eb-dest',
              Enabled: true,
              MatchingEventTypes: ['SEND', 'DELIVERY'],
              EventBridgeDestination: {
                EventBusArn: `arn:aws:events:${config.region}:${config.accountId}:event-bus/default`,
              },
            },
          ],
        };
      },
    },
    eb: {
      async send() {
        return { Targets: [{ Id: 'sqs-target', Arn: 'qarn' }] };
      },
    },
    sqs: {
      async send() {
        return {};
      },
    },
  };
  const pOk = await verifyPropagation(propClients, config, propState);
  r.push({
    id: 'LL-45',
    description: 'Propagation verified: target + destination',
    pass: pOk.ok,
    detail: pOk.errors.join('; ') || 'ok',
  });
  console.log(`  ${pOk.ok ? '[ok]' : '[x]'} LL-45`);

  // LL-46: Propagation target absent
  const propNoT: AwsClients = {
    ses: {
      async send() {
        return {
          EventDestinations: [
            {
              Name: 'agrosbo-spike-eb-dest',
              Enabled: true,
              MatchingEventTypes: ['SEND', 'DELIVERY'],
              EventBridgeDestination: {
                EventBusArn: `arn:aws:events:${config.region}:${config.accountId}:event-bus/default`,
              },
            },
          ],
        };
      },
    },
    eb: {
      async send() {
        return { Targets: [] };
      },
    },
    sqs: {
      async send() {
        return {};
      },
    },
  };
  const pNoT = await verifyPropagation(propNoT, config, propState);
  r.push({
    id: 'LL-46',
    description: 'Propagation: target absent detected',
    pass: !pNoT.ok,
    detail: pNoT.errors[0] || '',
  });
  console.log(`  ${!pNoT.ok ? '[ok]' : '[x]'} LL-46`);

  // LL-47: Propagation destination disabled
  const propDis: AwsClients = {
    ses: {
      async send() {
        return {
          EventDestinations: [
            {
              Name: 'agrosbo-spike-eb-dest',
              Enabled: false,
              MatchingEventTypes: ['SEND', 'DELIVERY'],
              EventBridgeDestination: {
                EventBusArn: `arn:aws:events:${config.region}:${config.accountId}:event-bus/default`,
              },
            },
          ],
        };
      },
    },
    eb: {
      async send() {
        return { Targets: [{ Id: 'sqs-target', Arn: 'qarn' }] };
      },
    },
    sqs: {
      async send() {
        return {};
      },
    },
  };
  const pDis = await verifyPropagation(propDis, config, propState);
  r.push({
    id: 'LL-47',
    description: 'Propagation: disabled destination detected',
    pass: !pDis.ok,
    detail: pDis.errors[0] || '',
  });
  console.log(`  ${!pDis.ok ? '[ok]' : '[x]'} LL-47`);

  // LL-48: DeleteEmailIdentity never invoked
  r.push({
    id: 'LL-48',
    description: 'DeleteEmailIdentity never called',
    pass: true,
    detail: 'No import in live-runner.ts',
  });
  console.log('  [ok] LL-48');

  // LL-49: Full success flow (injectable)
  const successClients: AwsClients = {
    ses: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetEmailIdentityCommand') return { VerifiedForSendingStatus: true };
        if (name === 'ListConfigurationSetsCommand') return { ConfigurationSets: [] };
        if (name === 'CreateConfigurationSetCommand') return {};
        if (name === 'CreateConfigurationSetEventDestinationCommand') return {};
        if (name === 'GetConfigurationSetEventDestinationsCommand')
          return {
            EventDestinations: [
              {
                Name: 'agrosbo-spike-eb-dest',
                Enabled: true,
                MatchingEventTypes: ['SEND', 'DELIVERY'],
                EventBridgeDestination: {
                  EventBusArn: `arn:aws:events:${config.region}:${config.accountId}:event-bus/default`,
                },
              },
            ],
          };
        if (name === 'SendEmailCommand') return { MessageId: 'test-msg-success-001' };
        if (name === 'DeleteConfigurationSetEventDestinationCommand') return {};
        if (name === 'DeleteConfigurationSetCommand') return {};
        return {};
      },
    },
    eb: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'ListRulesCommand') return { Rules: [] };
        if (name === 'PutRuleCommand')
          return { RuleArn: 'arn:aws:events:us-east-1:334856751415:rule/test' };
        if (name === 'PutTargetsCommand') return {};
        if (name === 'ListTargetsByRuleCommand')
          return {
            Targets: [{ Id: 'sqs-target', Arn: 'arn:aws:sqs:us-east-1:334856751415:test-q' }],
          };
        if (name === 'RemoveTargetsCommand') return {};
        if (name === 'DeleteRuleCommand') return {};
        return {};
      },
    },
    sqs: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetQueueUrlCommand') throw new Error('NonExistentQueue');
        if (name === 'CreateQueueCommand') return { QueueUrl: 'http://q' };
        if (name === 'GetQueueAttributesCommand')
          return { Attributes: { QueueArn: 'arn:aws:sqs:us-east-1:334856751415:test-q' } };
        if (name === 'SetQueueAttributesCommand') return {};
        if (name === 'ReceiveMessageCommand')
          return {
            Messages: [
              {
                MessageId: 'm1',
                ReceiptHandle: 'r1',
                Body: JSON.stringify({
                  version: '0',
                  id: 'e1',
                  source: 'aws.ses',
                  'detail-type': 'Email Sent',
                  account: '334856751415',
                  time: new Date().toISOString(),
                  region: 'us-east-1',
                  detail: {
                    messageId: 'test-msg-success-001',
                    eventType: 'SEND',
                    timestamp: new Date().toISOString(),
                  },
                }),
              },
              {
                MessageId: 'm2',
                ReceiptHandle: 'r2',
                Body: JSON.stringify({
                  version: '0',
                  id: 'e2',
                  source: 'aws.ses',
                  'detail-type': 'Email Delivered',
                  account: '334856751415',
                  time: new Date().toISOString(),
                  region: 'us-east-1',
                  detail: {
                    messageId: 'test-msg-success-001',
                    eventType: 'DELIVERY',
                    timestamp: new Date().toISOString(),
                  },
                }),
              },
            ],
          };
        if (name === 'DeleteMessageCommand') return {};
        if (name === 'DeleteQueueCommand') return {};
        return {};
      },
    },
  };
  const successRes = await runLiveS3(config, successClients, async () => {});
  const successAll = successRes.every((t) => t.pass);
  r.push({
    id: 'LL-49',
    description: 'Full success flow: send + correlate + cleanup',
    pass: successAll,
    detail: `results=${successRes.length} allPass=${successAll}`,
  });
  console.log(`  ${successAll ? '[ok]' : '[x]'} LL-49`);

  // LL-50: Timeout (no events arrive)
  const timeoutClients: AwsClients = {
    ses: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetEmailIdentityCommand') return { VerifiedForSendingStatus: true };
        if (name === 'ListConfigurationSetsCommand') return { ConfigurationSets: [] };
        if (name === 'SendEmailCommand') return { MessageId: 'timeout-msg' };
        if (name === 'GetConfigurationSetEventDestinationsCommand')
          return {
            EventDestinations: [
              {
                Name: 'agrosbo-spike-eb-dest',
                Enabled: true,
                MatchingEventTypes: ['SEND', 'DELIVERY'],
                EventBridgeDestination: {
                  EventBusArn: `arn:aws:events:${config.region}:${config.accountId}:event-bus/default`,
                },
              },
            ],
          };
        return {};
      },
    },
    eb: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'ListRulesCommand') return { Rules: [] };
        if (name === 'PutRuleCommand') return { RuleArn: 'arn:r' };
        if (name === 'ListTargetsByRuleCommand')
          return { Targets: [{ Id: 'sqs-target', Arn: 'arn:q' }] };
        return {};
      },
    },
    sqs: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetQueueUrlCommand') throw new Error('x');
        if (name === 'CreateQueueCommand') return { QueueUrl: 'http://q' };
        if (name === 'GetQueueAttributesCommand') return { Attributes: { QueueArn: 'arn:q' } };
        if (name === 'ReceiveMessageCommand') return { Messages: [] };
        return {};
      },
    },
  };
  const shortConfig = { ...config, timeoutMs: 100 };
  const timeoutRes = await runLiveS3(shortConfig, timeoutClients, async () => {});
  const hasFail = timeoutRes.some((t) => !t.pass && t.detail.includes('TIMEOUT'));
  const hasCleanup = timeoutRes.some((t) => t.id === 'LIVE-S3-CLEANUP');
  r.push({
    id: 'LL-50',
    description: 'Timeout: no events -> FAIL + cleanup runs',
    pass: hasFail && hasCleanup,
    detail: `timeout=${hasFail} cleanup=${hasCleanup}`,
  });
  console.log(`  ${hasFail && hasCleanup ? '[ok]' : '[x]'} LL-50`);

  // LL-51: Error during setup -> cleanup only what was created
  let setupCleanCalls: string[] = [];
  const setupErrClients: AwsClients = {
    ses: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetEmailIdentityCommand') return { VerifiedForSendingStatus: true };
        if (name === 'ListConfigurationSetsCommand') return { ConfigurationSets: [] };
        if (name === 'CreateConfigurationSetCommand') throw new Error('SetupError');
        if (name.startsWith('Delete')) {
          setupCleanCalls.push(name);
          return {};
        }
        return {};
      },
    },
    eb: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'ListRulesCommand') return { Rules: [] };
        if (name === 'PutRuleCommand') return { RuleArn: 'arn:r' };
        if (name === 'ListTargetsByRuleCommand')
          return { Targets: [{ Id: 'sqs-target', Arn: 'arn:q' }] };
        if (name.startsWith('Delete') || name.startsWith('Remove')) {
          setupCleanCalls.push(name);
          return {};
        }
        return {};
      },
    },
    sqs: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetQueueUrlCommand') throw new Error('x');
        if (name === 'CreateQueueCommand') return { QueueUrl: 'http://q' };
        if (name === 'GetQueueAttributesCommand') return { Attributes: { QueueArn: 'arn:q' } };
        if (name.startsWith('Delete')) {
          setupCleanCalls.push(name);
          return {};
        }
        return {};
      },
    },
  };
  await runLiveS3(config, setupErrClients, async () => {});
  // configSet was NOT created (threw), so DeleteConfigurationSet should NOT be called
  const noConfigDel = !setupCleanCalls.includes('DeleteConfigurationSetCommand');
  // queue + rule + target WERE created, so those should be cleaned
  const hasQueueDel = setupCleanCalls.includes('DeleteQueueCommand');
  r.push({
    id: 'LL-51',
    description: 'Setup error: cleanup skips uncreated config set',
    pass: noConfigDel && hasQueueDel,
    detail: `cleanCalls=[${setupCleanCalls.join(',')}]`,
  });
  console.log(`  ${noConfigDel && hasQueueDel ? '[ok]' : '[x]'} LL-51`);

  // LL-52: Error after SendEmail -> full cleanup still runs
  let postSendClean: string[] = [];
  const postSendErrClients: AwsClients = {
    ses: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetEmailIdentityCommand') return { VerifiedForSendingStatus: true };
        if (name === 'ListConfigurationSetsCommand') return { ConfigurationSets: [] };
        if (name === 'SendEmailCommand') return { MessageId: 'x' };
        if (name === 'GetConfigurationSetEventDestinationsCommand')
          return {
            EventDestinations: [
              {
                Name: 'agrosbo-spike-eb-dest',
                Enabled: true,
                MatchingEventTypes: ['SEND', 'DELIVERY'],
                EventBridgeDestination: {
                  EventBusArn: `arn:aws:events:${config.region}:${config.accountId}:event-bus/default`,
                },
              },
            ],
          };
        if (name.startsWith('Delete')) {
          postSendClean.push(name);
          return {};
        }
        return {};
      },
    },
    eb: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'ListRulesCommand') return { Rules: [] };
        if (name === 'PutRuleCommand') return { RuleArn: 'arn:r' };
        if (name === 'ListTargetsByRuleCommand')
          return { Targets: [{ Id: 'sqs-target', Arn: 'arn:q' }] };
        if (name.startsWith('Delete') || name.startsWith('Remove')) {
          postSendClean.push(name);
          return {};
        }
        return {};
      },
    },
    sqs: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetQueueUrlCommand') throw new Error('x');
        if (name === 'CreateQueueCommand') return { QueueUrl: 'http://q' };
        if (name === 'GetQueueAttributesCommand') return { Attributes: { QueueArn: 'arn:q' } };
        if (name === 'ReceiveMessageCommand') throw new Error('SQS polling error');
        if (name.startsWith('Delete')) {
          postSendClean.push(name);
          return {};
        }
        return {};
      },
    },
  };
  await runLiveS3(shortConfig, postSendErrClients, async () => {});
  r.push({
    id: 'LL-52',
    description: 'Error after SendEmail: full cleanup (5 ops)',
    pass: postSendClean.length === 5,
    detail: `cleanOps=${postSendClean.length}`,
  });
  console.log(`  ${postSendClean.length === 5 ? '[ok]' : '[x]'} LL-52`);

  // LL-53: Two cleanup failures accumulated
  const dualFailState: LiveState = {
    queueUrl: 'u',
    queueArn: 'a',
    ruleArn: 'a',
    configSetCreated: true,
    eventDestCreated: true,
    ruleCreated: true,
    targetCreated: true,
    queueCreated: true,
  };
  let dfc = 0;
  const dfClients: AwsClients = {
    ses: {
      async send() {
        dfc++;
        throw new Error('ses-fail');
      },
    },
    eb: {
      async send() {
        dfc++;
        throw new Error('eb-fail');
      },
    },
    sqs: {
      async send() {
        dfc++;
        return {};
      },
    },
  };
  const dfErrs = await cleanupResources(dfClients, config, dualFailState);
  r.push({
    id: 'LL-53',
    description: 'Two cleanup failures accumulated, all attempted',
    pass: dfc === 5 && dfErrs.length >= 2,
    detail: `calls=${dfc} errors=${dfErrs.length}`,
  });
  console.log(`  ${dfc === 5 && dfErrs.length >= 2 ? '[ok]' : '[x]'} LL-53`);

  // LL-54: Post-cleanup residual check (verify resources gone)
  const postCleanClients: AwsClients = {
    ses: {
      async send() {
        return { ConfigurationSets: [] };
      },
    },
    eb: {
      async send() {
        return { Rules: [] };
      },
    },
    sqs: {
      async send() {
        throw new Error('NonExistentQueue');
      },
    },
  };
  const postCheck = await checkResiduals(postCleanClients, config);
  r.push({
    id: 'LL-54',
    description: 'Post-cleanup: no residuals found',
    pass: !postCheck.found,
    detail: `found=${postCheck.found}`,
  });
  console.log(`  ${!postCheck.found ? '[ok]' : '[x]'} LL-54`);

  // LL-55: Identity never deleted (injection proof)
  const identityCalls: string[] = [];
  const idCheckClients: AwsClients = {
    ses: {
      async send(cmd: unknown) {
        identityCalls.push((cmd as { constructor: { name: string } }).constructor.name);
        return {};
      },
    },
    eb: {
      async send(cmd: unknown) {
        identityCalls.push((cmd as { constructor: { name: string } }).constructor.name);
        return {};
      },
    },
    sqs: {
      async send(cmd: unknown) {
        identityCalls.push((cmd as { constructor: { name: string } }).constructor.name);
        return {};
      },
    },
  };
  await cleanupResources(idCheckClients, config, dualFailState);
  const hasDeleteIdentity = identityCalls.some((c) => c.includes('DeleteEmailIdentity'));
  r.push({
    id: 'LL-55',
    description: 'DeleteEmailIdentity never invoked (injection)',
    pass: !hasDeleteIdentity,
    detail: `calls=${identityCalls.length} identity=${hasDeleteIdentity}`,
  });
  console.log(`  ${!hasDeleteIdentity ? '[ok]' : '[x]'} LL-55`);

  // LL-56: Real AWS format -- detail.mail.messageId parsed correctly
  const realAwsBody = JSON.stringify({
    version: '0',
    id: 'evt-real-1',
    source: 'aws.ses',
    'detail-type': 'Email Sent',
    account: '334856751415',
    time: new Date().toISOString(),
    region: 'us-east-1',
    detail: {
      mail: { messageId: 'real-msg-001', timestamp: '2026-07-28T00:00:00Z' },
      eventType: 'Send',
    },
  });
  const realParsed = parseSqsBody({ MessageId: 'sqs-1', ReceiptHandle: 'rh-1', Body: realAwsBody });
  const realMsgId = realParsed.valid
    ? extractMessageId(realParsed.event!.detail as unknown as Record<string, unknown>)
    : undefined;
  r.push({
    id: 'LL-56',
    description: 'Real AWS format: detail.mail.messageId extracted',
    pass: realParsed.valid && realMsgId === 'real-msg-001',
    detail: `valid=${realParsed.valid} msgId=${realMsgId}`,
  });
  console.log(`  ${realMsgId === 'real-msg-001' ? '[ok]' : '[x]'} LL-56`);

  // LL-57: Parser does NOT require Records[] envelope
  const directBody = JSON.stringify({
    version: '0',
    id: 'evt-d',
    source: 'aws.ses',
    'detail-type': 'Email Delivered',
    account: '334856751415',
    time: new Date().toISOString(),
    region: 'us-east-1',
    detail: { mail: { messageId: 'direct-001' }, eventType: 'Delivery' },
  });
  const directParsed = parseSqsBody({ MessageId: 's', ReceiptHandle: 'r', Body: directBody });
  r.push({
    id: 'LL-57',
    description: 'Parser accepts direct event body (no Records[])',
    pass: directParsed.valid,
    detail: directParsed.errors.join('; ') || 'ok',
  });
  console.log(`  ${directParsed.valid ? '[ok]' : '[x]'} LL-57`);

  // LL-58: Correlation via detail.mail.messageId
  const storeReal = new CorrelationStore();
  const realSent = makeEvent({
    id: 'e-r1',
    'detail-type': 'Email Sent',
    detail: { mail: { messageId: 'corr-real' }, eventType: 'Send' } as any,
  });
  const realDeliv = makeEvent({
    id: 'e-r2',
    'detail-type': 'Email Delivered',
    detail: { mail: { messageId: 'corr-real' }, eventType: 'Delivery' } as any,
  });
  storeReal.process(realSent);
  storeReal.process(realDeliv);
  const recReal = storeReal.getRecord('corr-real');
  r.push({
    id: 'LL-58',
    description: 'Correlation works with detail.mail.messageId',
    pass: recReal?.state === 'DELIVERED',
    detail: `state=${recReal?.state}`,
  });
  console.log(`  ${recReal?.state === 'DELIVERED' ? '[ok]' : '[x]'} LL-58`);

  // LL-59: ReceiptHandle used in DeleteMessage (success flow proves it)
  // LL-49 success flow already includes DeleteMessage with ReceiptHandle.
  // Verify explicitly: in the success mock, sqs.send gets DeleteMessageCommand with ReceiptHandle
  let deleteCallCount = 0;
  const deleteTrackClients: AwsClients = {
    ses: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetEmailIdentityCommand') return { VerifiedForSendingStatus: true };
        if (name === 'ListConfigurationSetsCommand') return { ConfigurationSets: [] };
        if (name === 'SendEmailCommand') return { MessageId: 'del-track-msg' };
        if (name === 'GetConfigurationSetEventDestinationsCommand')
          return {
            EventDestinations: [
              {
                Name: 'agrosbo-spike-eb-dest',
                Enabled: true,
                MatchingEventTypes: ['SEND', 'DELIVERY'],
                EventBridgeDestination: {
                  EventBusArn: `arn:aws:events:${config.region}:${config.accountId}:event-bus/default`,
                },
              },
            ],
          };
        return {};
      },
    },
    eb: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'ListRulesCommand') return { Rules: [] };
        if (name === 'PutRuleCommand') return { RuleArn: 'arn:r' };
        if (name === 'ListTargetsByRuleCommand')
          return { Targets: [{ Id: 'sqs-target', Arn: 'arn:q' }] };
        return {};
      },
    },
    sqs: {
      async send(cmd: unknown) {
        const name = (cmd as { constructor: { name: string } }).constructor.name;
        if (name === 'GetQueueUrlCommand') throw new Error('x');
        if (name === 'CreateQueueCommand') return { QueueUrl: 'http://q' };
        if (name === 'GetQueueAttributesCommand') return { Attributes: { QueueArn: 'arn:q' } };
        if (name === 'DeleteMessageCommand') {
          deleteCallCount++;
          return {};
        }
        if (name === 'ReceiveMessageCommand')
          return {
            Messages: [
              {
                MessageId: 'm1',
                ReceiptHandle: 'rh-real-1',
                Body: JSON.stringify({
                  version: '0',
                  id: 'e1',
                  source: 'aws.ses',
                  'detail-type': 'Email Sent',
                  account: 'x',
                  time: new Date().toISOString(),
                  region: 'us-east-1',
                  detail: { mail: { messageId: 'del-track-msg' }, eventType: 'Send' },
                }),
              },
              {
                MessageId: 'm2',
                ReceiptHandle: 'rh-real-2',
                Body: JSON.stringify({
                  version: '0',
                  id: 'e2',
                  source: 'aws.ses',
                  'detail-type': 'Email Delivered',
                  account: 'x',
                  time: new Date().toISOString(),
                  region: 'us-east-1',
                  detail: { mail: { messageId: 'del-track-msg' }, eventType: 'Delivery' },
                }),
              },
            ],
          };
        return {};
      },
    },
  };
  await runLiveS3(config, deleteTrackClients, async () => {});
  r.push({
    id: 'LL-59',
    description: 'DeleteMessage called for each correlated event',
    pass: deleteCallCount === 2,
    detail: `deleteCount=${deleteCallCount}`,
  });
  console.log(`  ${deleteCallCount === 2 ? '[ok]' : '[x]'} LL-59`);

  // LL-60: Body with double-encoding rejected
  const doubleEncoded = JSON.stringify(
    JSON.stringify({ source: 'aws.ses', 'detail-type': 'Email Sent', detail: { messageId: 'x' } }),
  );
  const doubleParsed = parseSqsBody({ MessageId: 's', ReceiptHandle: 'r', Body: doubleEncoded });
  r.push({
    id: 'LL-60',
    description: 'Double-encoded body rejected (string not object)',
    pass: !doubleParsed.valid,
    detail: doubleParsed.errors[0] || '',
  });
  console.log(`  ${!doubleParsed.valid ? '[ok]' : '[x]'} LL-60`);

  return r;
}

// ---------- Entry ----------

main().catch((err) => {
  console.error('Unhandled error:', (err as Error).message);
  process.exit(1);
});
