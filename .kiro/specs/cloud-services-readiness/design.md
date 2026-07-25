# Design - cloud-services-readiness

## Objetivo

Preparar los cimientos para servicios cloud administrados sin crearlos ni
desplegar infraestructura.

## Principio rector

La implementación actual es baseline funcional; la arquitectura objetivo
determina las decisiones. Conservamos funcionalidad útil mientras establecemos
fronteras, contratos, configuración y garantías.

## Fronteras de proveedores

```
api/src/providers/
  identity/
    types.ts          → IdentityPrincipal, IdentityProvider interface
    local-session.ts  → LocalSessionIdentityProvider (cookie HMAC actual)
  attachments/
    types.ts          → AttachmentStorage interface (prepareUpload, confirmUpload, getDownloadAccess, deleteObject, verifyObject)
    local.ts          → LocalAttachmentStorage (disco, actual attachments.ts refactored)
  documents/
    types.ts          → DocumentExtractionProvider, DocumentExtractionResult
    noop.ts           → NoOpDocumentExtraction (retorna vacío)
  index.ts            → factory / selección por config
```

Selección por `APP_AUTH_PROVIDER`, `ATTACHMENTS_STORAGE_DRIVER`,
`DOCUMENT_EXTRACTION_PROVIDER`.

## Principal interno

```typescript
interface IdentityPrincipal {
  subject: string;            // Cognito sub o ID local
  internalUserId: string;     // ID en tabla users
  organizationId: string;
  farmIds: string[];
  role: UserRole;
  permissions: Set<Permission>;
  authenticationProvider: 'local-session' | 'cognito-jwt';
}
```

El middleware `attachUser` produce un `IdentityPrincipal` en `req.principal`
independientemente del provider.

## Ciclo de vida DB

- `drizzle.config.ts` en raíz de `api/`, apunta a `shared/schema.ts`, output
  `api/migrations/`.
- Migración inicial = snapshot del schema completo actual.
- Scripts: `db:generate` (drizzle-kit generate), `db:migrate` (drizzle-kit
  migrate), `db:check` (drizzle-kit check).
- Seed: refactorizado como script independiente (`npm run db:seed`), idempotente.

## Idempotencia atómica

Flujo corregido:
1. `claim(key)` → `SELECT ... FOR UPDATE` o insert; retorna `claimed`/
   `completed`/`processing`.
2. Si `claimed`: ejecutar efecto de negocio + `complete(key, token, status,
   body)` en la **misma transacción** del efecto.
3. Si la transacción falla: la key se libera (rollback incluye claim row).
4. Si crash post-efecto pero pre-respuesta: la key queda `completed` → reintento
   devuelve el resultado almacenado.
5. Registros `processing` no se borran indiscriminadamente; se liberan solo si
   `createdAt + STALE_TTL < now`.

## Health endpoints

- `GET /health/live` → 200 `{ ok: true }` (no depende de DB).
- `GET /health/ready` → verifica config + schema + storage; 200 si listo, 503
  si no.
- Eliminar los dos `/health` ambiguos actuales.

## Lambda init

- `handlers/index.ts::setup()` → si falla, **no** set `initialized=true`; la
  siguiente invocación reintenta; el handler **no** pasa tráfico si no está
  inicializado.
- Import de `vite.ts` se hace dinámico y solo en dev.

## API client

- `VITE_API_BASE_URL` → default `''` (same-origin, dev local).
- `AuthTokenProvider` interface: `getToken(): Promise<string | null>`.
- `LocalSessionAuthProvider` → retorna null (usa credentials include).
- `CognitoAuthProvider` (futuro) → retorna JWT del pool.
- `queryClient` y `engine` inyectan auth header si token presente.

## CI PostgreSQL

Nuevo job `integration` en `.github/workflows/ci.yml`:
- PostgreSQL 15 service container.
- `npm run db:migrate`, `npm run db:seed`.
- Tests de integración (idempotencia concurrente, health/ready).
- Sin AWS/Azure.

## Criterios de validación

- 60+ tests (existentes + nuevos) verdes.
- Gates green (clean/format/lint/typecheck/test/build).
- Login local funciona.
- Cola offline funciona.
- No se crea ningún recurso cloud.
- Docs actualizados consistentemente.
