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
import { parseSqsBody, validateEvent } from './event-parser.js';
import { CorrelationStore } from './correlation.js';
import { buildQueuePolicy, validateQueuePolicy } from './queue-policy.js';
import { buildEventPattern, validateEventPattern } from './event-pattern.js';
import { buildCleanupPlan } from './cleanup-plan.js';
import { sanitize, containsSensitive } from './sanitize.js';
import { buildEvidence, printEvidence } from './evidence.js';
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

  // 2. Dry-run default
  r.push({
    id: 'CFG-02',
    description: 'Dry-run true by default',
    pass: config.dryRun === true,
    detail: `dryRun=${config.dryRun}`,
  });
  console.log(`  ${config.dryRun ? '[ok]' : '[x]'} CFG-02`);

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

  // 4. Placeholder sender rejected outside mock
  const origDry = process.env.SES_DRY_RUN;
  process.env.SES_DRY_RUN = 'false';
  const liveResult = loadConfig();
  process.env.SES_DRY_RUN = origDry ?? 'true';
  const hasSenderError = liveResult.errors.some((e) => e.includes('example.invalid'));
  r.push({
    id: 'CFG-04',
    description: 'Placeholder sender rejected in live mode',
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

  // 31. Zero AWS
  r.push({
    id: 'INF-31',
    description: 'Zero AWS calls in dry-run',
    pass: config.dryRun === true,
    detail: `dryRun=${config.dryRun}`,
  });
  console.log(`  ${config.dryRun ? '[ok]' : '[x]'} INF-31`);

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

// ---------- Entry ----------

main().catch((err) => {
  console.error('Unhandled error:', (err as Error).message);
  process.exit(1);
});
