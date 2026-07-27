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
