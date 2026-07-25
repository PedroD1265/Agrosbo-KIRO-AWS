# Cloud Readiness Review Closure

Evidencia de cierre para los 7 comentarios del code review de PR #2.

## Matriz de Copilot

| # | Thread original | Archivo | Commit | Test exacto | Estado |
|---|---|---|---|---|---|
| 1 | DATABASE_URL + USE_MEM_STORAGE override | `api/src/storage.ts`, `api/src/env.ts` | `c7f93fe` + `3e95476` | `api/src/test/storage-runtime.test.ts` (4 tests: singleton type, transactional signal, env.useMemStorage semantics) | **fixed** |
| 2 | Stale reclaim concurrente | `api/src/idempotency.ts` | `dacf8fb` (orphan cleanup by TTL) | `api/src/test/integration/idempotency.postgres.test.ts` tests 10 + 12 (stale row race, two concurrent claims → 1 winner) | **verified** |
| 3 | Math.min entre Retry-After (should be max) | `web/src/lib/sync/engine.ts` | `1765f5d` | `web/src/test/sync-engine-backoff.test.ts` "multiple operations: max(Retry-After)" | **fixed** |
| 4 | Retry-After ignorando backoff (should respect floor) | `web/src/lib/sync/engine.ts` | `1765f5d` + `d07c59f` | `web/src/test/sync-engine-backoff.test.ts` "backoff=6000 + Retry-After=2000 → 6000" + "no retry before computed delay" | **fixed** |
| 5 | Attachment delete basado en remoteUrl | `api/src/attachments.ts`, `shared/schema.ts`, `api/migrations/0001_object_key.sql` | `b74e51c` + `074d3cc` | `api/src/test/attachments-storage.test.ts` (21 unit tests: creation, metadata failure compensation, cleanup failure, safe delete with `AttachmentDeleteError`, expired `remoteUrl` isolation) + `api/src/test/integration/migrations.postgres.test.ts` (backfill, idempotency, DB retention on delete failure) | **fixed** |
| 6 | Test stale mal nombrado | `web/src/test/idempotency.test.ts` | `3e95476` | Renamed to "fresh processing entry blocks re-claim (not stale yet)" with clarification comment | **fixed** |
| 7 | URL PostgreSQL con credenciales escapadas | `api/src/env.ts` | `90db16b` | `api/src/test/config.test.ts` (8 tests: @, :, /, %20, pathname, round-trip, reject non-pg, reject missing host) | **fixed** |

## Detalle de Solución — Thread 5 (Attachment ObjectKey & Lifecycle)

- **Columna `objectKey`**: Añadida a la tabla `attachments` en `shared/schema.ts` como la identidad canónica y estable del objeto en storage.
- **Migración 0001**: `api/migrations/0001_object_key.sql` añade `object_key`, realiza backfill (`entity_type/entity_id/id-file_name`), marca `NOT NULL` y añade un índice único `attachments_object_key_uq`. Es 100% idempotente (`ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`).
- **Compensación en Creación**: Si `getDownloadAccess` o `insert metadata` fallan tras escribir el objeto, `createAttachment` ejecuta `storageProvider.deleteObject(objectKey)` como acción compensatoria. Si el cleanup falla, se registra estructuradamente `cleanupErr` sin enmascarar ni reemplazar la excepción principal.
- **Eliminación Segura**: `deleteAttachment` carga `row.objectKey`, ejecuta `storageProvider.deleteObject(row.objectKey)` y borra la metadata en DB solo tras éxito. Si `deleteObject` falla, la metadata permanece intacta en DB y se propaga un error tipado `AttachmentDeleteError` con `code = 'ATTACHMENT_DELETE_FAILED'`.
- **Aislamiento de `remoteUrl`**: `remoteUrl` (incluyendo URLs prefirmadas o efímeras de S3) nunca se utiliza como clave de identidad durante el runtime ni en eliminaciones.
