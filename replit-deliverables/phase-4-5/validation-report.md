# Phase 4–5 salvage pack validation report

Result: **PASS**

Baseline: `156036a`

| Check | Status | Description | Detail |
| --- | --- | --- | --- |
| CHK-01 | PASS | Exact allowlist is present in the pack directory | 11 allowed files and no extras |
| CHK-02 | PASS | All JSON files parse | 8 JSON files parsed |
| CHK-03 | PASS | TypeScript route evidence can be derived | 88 routes derived from app.ts, routes.ts, and health.ts |
| CHK-04 | PASS | Route catalog exactly matches current TypeScript | No invented, omitted, mis-prefixed, mis-guarded, or falsely idempotent routes |
| CHK-05 | PASS | Route IDs are unique and sequential | 88 unique route IDs |
| CHK-06 | PASS | All fixture route references resolve to route IDs | All route strings and routeId values resolve |
| CHK-07 | PASS | RBAC matrix matches global auth and route guards | Global authentication is distinct from requireRole |
| CHK-08 | PASS | Fixture counts and IDs are exact and unique | 48 read, 36 write, 24 idempotency, and 24 failure cases |
| CHK-09 | PASS | Write executions have a visible draft and explicit confirmation | No silent agent mutation found |
| CHK-10 | PASS | Conversation fixtures respect ADR-018 boundaries | No definitive diagnosis or specific pesticide recommendation |
| CHK-11 | PASS | Idempotency cases match current constants and cover payload semantics | Replay, payload mismatch limitation, concurrency, states, and both backends covered |
| CHK-12 | PASS | Failure cases have honest explicit classifications | Implemented code, proposals, future infrastructure, and runtime evidence are distinct |
| CHK-13 | PASS | Manifest and baseline counts/status flags are correct | Baseline, counts, review flags, and production limitations match |
| CHK-14 | PASS | No secrets, real ARNs, ZIPs, or hard-coded localhost URLs | No secret material, ARN, ZIP, or localhost endpoint detected |
| CHK-15 | PASS | Git changes remain inside the exact allowlist and are unstaged | Only the eleven unstaged allowlisted files are present |

The validator is read-only unless invoked with `--write`.
