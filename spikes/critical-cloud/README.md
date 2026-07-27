# Spike: Critical Cloud (Spec 17)

Disposable harnesses to validate AWS services for AGROSBO P0 golden path.

## Structure

```
harnesses/
  s1-bedrock-tool-calling/   (requires AWS credentials)
  s2-transcribe-voice/       (requires AWS credentials)
  s3-ses-events/             (requires AWS credentials)
  s4-token-secure/           (100% local)
results/
  manifest-s1.md .. manifest-s4.md
  microvalidation-polly.md
  microvalidation-aurora.md
cleanup/
  cleanup-checklist.md
```

## Running S1 — Bedrock Tool Calling

**Dry-run (default, no AWS):**

```bash
npm run s1
```

**Live mode (requires credentials + human authorization — T10 only):**

```bash
npm run s1:live
```

The dry-run mode uses a mock client that simulates Bedrock Converse API responses.
It validates: tool definitions, argument validation, conversation loop, iteration
limits, timeouts, sanitized logs, and execution evidence.

## Running S2 — Transcribe Voice

**Dry-run (default, no AWS):**

```bash
npm run s2
```

Validates locally: WAV parsing, corpus structure (40 synthetic phrases),
vocabulary candidate list, WER metrics, critical term detection, number/unit/temporal
accuracy, mock Transcribe scenarios, log sanitization, and structured evidence.

No locale has been selected as definitive. Live execution against Amazon Transcribe
corresponds to T11 and requires separate human authorization.

## Running S3 -- SES Events

**Dry-run (default, no AWS):**

```bash
npm run s3
```

Validates locally: SES send simulation, EventBridge event parsing, SQS message
handling, correlation by MessageId, deduplication, out-of-order events, expiry,
queue policy validation, error handling, log sanitization, cleanup plan, and
structured evidence.

Architecture: SES v2 ConfigurationSet -> EventBridge default bus -> SQS queue.
SES remains in sandbox. Live execution corresponds to T12.

## Running S4 (local only)

```bash
npm run s4
```

For PostgreSQL concurrency tests (dedicated spike container on port 54322):

```bash
npm run s4:db:up
npm run s4:pg
npm run s4:db:down
```

The PostgreSQL tests use a dedicated container (`agrosbo-spike-token-db` on
port 54322, database `agrosbo_spike_token`). Do NOT use `agrosbo-local-db`
(port 54321) — that is reserved for the application's development database.

## Rules

- This code is DISPOSABLE. Do not import from production code.
- No real user data. All fixtures are synthetic.
- Never commit secrets or credentials.
- AWS harnesses (S1-S3) require human execution with temporary credentials.
