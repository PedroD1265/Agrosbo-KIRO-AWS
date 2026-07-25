# Cloud Readiness Review Closure

Evidencia de cierre para los 7 comentarios del code review de PR #2.

## Matriz de Copilot

| # | Thread original | Archivo | Commit | Test exacto | Estado |
|---|---|---|---|---|---|
| 1 | DATABASE_URL + USE_MEM_STORAGE override | `api/src/storage.ts`, `api/src/env.ts` | `c7f93fe` + `3e95476` | `api/src/test/storage-runtime.test.ts` (4 tests: singleton type, transactional signal, env.useMemStorage semantics) | **fixed** |
| 2 | Stale reclaim concurrente | `api/src/idempotency.ts` | `dacf8fb` (orphan cleanup by TTL) | `api/src/test/integration/idempotency.postgres.test.ts` tests 10 + 12 (stale row race, two concurrent claims → 1 winner) | **verified** |
| 3 | Math.min entre Retry-After (should be max) | `web/src/lib/sync/engine.ts` | `1765f5d` | `web/src/test/sync-engine-backoff.test.ts` "multiple operations: max(Retry-After)" | **fixed** |
| 4 | Retry-After ignorando backoff (should respect floor) | `web/src/lib/sync/engine.ts` | `1765f5d` + `d07c59f` | `web/src/test/sync-engine-backoff.test.ts` "backoff=6000 + Retry-After=2000 → 6000" + "no retry before computed delay" | **fixed** |
| 5 | Attachment delete basado en remoteUrl | `api/src/attachments.ts` | `52c6e8f` | `api/src/test/integration/idempotency.postgres.test.ts` test 13 (DELETE 204 + replay) + documented in `docs/architecture/cloud-services-readiness-audit.md` §11 (S3 future uses objectKey, not URL) | **fixed** |
| 6 | Test stale mal nombrado | `web/src/test/idempotency.test.ts` | this commit | Renamed to "fresh processing entry blocks re-claim (not stale yet)" with clarification comment | **fixed** |
| 7 | URL PostgreSQL con credenciales escapadas | `api/src/env.ts` | `90db16b` | `api/src/test/config.test.ts` (8 tests: @, :, /, %20, pathname, round-trip, reject non-pg, reject missing host) | **fixed** |

## Notes

- Thread 2 is **verified** (not fixed in this batch) because the stale reclaim
  logic was corrected in `dacf8fb` (orphan cleanup by TTL) and demonstrated by
  integration tests 10 and 12 that run two concurrent claims on a stale row.
- Thread 5 is **fixed**: `deleteAttachment` now uses the canonical object key
  from the `storageKey` field (or derives it from the relative path), not the
  full `remoteUrl`. The future S3 migration (Spec #8) will use `objectKey` as
  the persistent identity column; presigned URLs will never be stored as
  identifiers.
- All tests pass locally (102 unit, 21 integration with PostgreSQL).
- Integration tests require `DATABASE_URL`; they skip/fail gracefully without it.
