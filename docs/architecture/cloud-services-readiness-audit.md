# AGROSBO - Cloud Services Readiness Audit

Auditoría current → target para la preparación de plataforma hacia servicios
cloud administrados. No marca como implementado algo que solo tiene una variable
o un adaptador incompleto.

---

## 1. Hosting

| Aspecto | Detalle |
|---------|---------|
| **Current** | Express sirve el build de Vite mediante `express.static` (prod) o middleware Vite HMR (dev). Archivo `api/src/vite.ts`. |
| **Target** | **AWS Amplify Hosting** por rama; frontend desacoplado de la API; `VITE_API_BASE_URL` configurable. CloudFront separado solo si se demuestra necesidad. |
| **Evidencia** | `api/src/vite.ts::setupStatic`, `web/vite.config.ts` (build → `dist/public`). |
| **Reutilizable** | Build de Vite (output `dist/public`) ya es un artefacto estático correcto. |
| **Temporal** | El Express que sirve estáticos queda solo para dev. |
| **Preparación** | Añadir `VITE_API_BASE_URL` al frontend; desacoplar la comunicación de same-origin; auth por token en staging/prod. |
| **Servicio** | Amplify Hosting |
| **Riesgo** | Bajo — el build es estático estándar. |
| **Dependencia** | ADR 011; preparación de auth con token. |
| **Criterio** | `VITE_API_BASE_URL` funciona; build desplegable sin Express. |

---

## 2. API Client

| Aspecto | Detalle |
|---------|---------|
| **Current** | `web/src/lib/queryClient.ts` usa rutas relativas (`/api/*`) con `credentials: "include"`. Cola offline usa `fetch(url, { credentials: "include", headers: { "X-Idempotency-Key" } })`. |
| **Target** | Base URL configurable (`VITE_API_BASE_URL`); `AuthTokenProvider` abstrae cookie vs Bearer token; React Query no conoce el provider. |
| **Evidencia** | `queryClient.ts::defaultFetcher`, `sync/engine.ts::send`. |
| **Reutilizable** | Estructura de fetcher y cola; mutaciones; idempotency-key. |
| **Temporal** | `credentials: "include"` hardcodeado (solo válido same-origin). |
| **Preparación** | Introducir `AuthTokenProvider` interface; wrapper de fetch que inyecta auth header según provider; configurar base URL. |
| **Servicio** | Amplify Hosting (CORS) + Cognito (JWT). |
| **Riesgo** | Medio — cambiar fetch centralizado impacta toda la app; tests manuales necesarios. |
| **Dependencia** | ADR 010, 011. |
| **Criterio** | App funciona con `local-session` (credentials) y lista para `cognito-jwt` (Bearer). |

---

## 3. Autenticación

| Aspecto | Detalle |
|---------|---------|
| **Current** | Cookie HMAC firmada (`api/src/auth.ts`); login por email/username + scrypt; `AUTH_ENFORCEMENT` on/off; revocación en memoria + DB. |
| **Target** | **Amazon Cognito** (staging/prod); JWT authorizer de API Gateway; usuario interno vinculado por `sub`; proveedor local solo para dev/tests. |
| **Evidencia** | `auth.ts::attachUser`, `setSessionCookie`, `decodeToken`, `requireRole`. |
| **Reutilizable** | RBAC (`requireRole`), tabla `users`, modelo de roles/permisos. |
| **Temporal** | Cookie HMAC, `SESSION_SECRET`, `AUTH_ENFORCEMENT=off`, demo user. |
| **Preparación** | Definir `IdentityProvider` interface con principal estable (`subject`, `internalUserId`, `organizationId`, `farmIds`, `role`, `permissions`, `authenticationProvider`); implementar `LocalSessionIdentityProvider`; preparar contrato para `CognitoJwtIdentityProvider`. |
| **Servicio** | Cognito User Pool, API Gateway JWT authorizer. |
| **Riesgo** | Alto — cambio de autenticación afecta toda la plataforma. |
| **Dependencia** | ADR 010; tenancy (memberships). |
| **Criterio** | API usa `IdentityProvider` abstracción; local-session funciona; Cognito provider definido (no implementado). |

---

## 4. Autorización

| Aspecto | Detalle |
|---------|---------|
| **Current** | `requireRole` middleware; 5 roles enum; permissions matrix en `web/src/lib/permissions.ts`. |
| **Target** | Roles + organizaciones + granjas + membresías en PostgreSQL; principal incluye `farmIds` y `permissions`. |
| **Evidencia** | `auth.ts::requireRole`, `permissions.ts::ROLE_PERMISSIONS`. |
| **Reutilizable** | Modelo de roles; middleware guard; permissions matrix. |
| **Temporal** | Hardcoded `org-default`; sin memberships. |
| **Preparación** | Principal con `organizationId`/`farmIds`; tablas membership (diseño, no implementar tenancy completo en esta fase). |
| **Servicio** | PostgreSQL (tablas); Cognito (claims custom). |
| **Riesgo** | Medio — tenancy es un cambio transversal posterior. |
| **Dependencia** | ADR 010; Spec #2 (auth-tenancy). |
| **Criterio** | Principal incluye orgId/farmIds; guard los respeta si presentes. |

---

## 5. Tenancy

| Aspecto | Detalle |
|---------|---------|
| **Current** | `ORG_ID = "org-default"` hardcodeado; tablas `organizations`, `farms` existen pero no se filtra por membresía. |
| **Target** | `organization_memberships` + `farm_memberships`; toda consulta filtrada por membresía. |
| **Evidencia** | `dbStorage.ts` usa `ORG_ID` constante; `schema.ts` define `organizations`, `farms`. |
| **Reutilizable** | Tablas base. |
| **Temporal** | `ORG_ID` hardcodeado. |
| **Preparación** | Incluir `organizationId` en el principal; preparar para filtrado posterior sin implementar aislamiento completo. |
| **Servicio** | PostgreSQL. |
| **Riesgo** | Medio — migración de datos existentes. |
| **Dependencia** | multi-tenancy-plan.md; Spec #2. |
| **Criterio** | Principal porta organizationId; docs de plan vigentes; sin bloqueo para la próxima Spec. |

---

## 6. Lambda

| Aspecto | Detalle |
|---------|---------|
| **Current** | Adaptador en `api/src/handlers/index.ts` con `@vendia/serverless-express`; `LAMBDA_TASK_ROOT` detectado en `index.ts`. |
| **Target** | Lambda única ejecutando Express; inicialización fail-closed; Data API; sin pools persistentes. |
| **Evidencia** | `handlers/index.ts::handler`; `index.ts` omite `listen()` si `LAMBDA_TASK_ROOT`. |
| **Reutilizable** | Adaptador serverless-express; detección de entorno. |
| **Temporal** | Import estático de `vite.ts` (pesa en bundle, innecesario en Lambda). |
| **Preparación** | Import dinámico de Vite; inicialización fail-closed (no `initialized=true` tras error); health/ready checks; configuración independiente del runtime. |
| **Servicio** | Lambda + API Gateway HTTP API. |
| **Riesgo** | Medio — cold start, init failure handling. |
| **Dependencia** | ADR 007; S3 para adjuntos. |
| **Criterio** | Init falla → invocación falla; no atiende tráfico parcial; import Vite aislado. |

---

## 7. API Gateway

| Aspecto | Detalle |
|---------|---------|
| **Current** | No existe; Express maneja todo directamente. |
| **Target** | API Gateway HTTP API; JWT authorizer (Cognito); proxy a Lambda. |
| **Evidencia** | — (target only). |
| **Reutilizable** | Las rutas Express se preservan tal cual detrás del proxy. |
| **Temporal** | — |
| **Preparación** | Asegurar que la API no depende de headers/estado que API GW no propague; preparar para JWT authorizer. |
| **Servicio** | API Gateway HTTP API. |
| **Riesgo** | Bajo — proxy transparente. |
| **Dependencia** | Lambda; ADR 010 (Cognito JWT). |
| **Criterio** | No hay dependencias ocultas en headers/estado que impidan el proxy. |

---

## 8. PostgreSQL

| Aspecto | Detalle |
|---------|---------|
| **Current** | `pg` pool si `DATABASE_URL`; schema definido en `shared/schema.ts` (Drizzle pg-core); seed idempotente en `dbStorage.ts::seedDatabase`. |
| **Target** | Aurora PostgreSQL Serverless v2 + RDS Data API; migraciones reproducibles; PostgreSQL local para dev/tests. |
| **Evidencia** | `db.ts` (dual: pool o Data API); `schema.ts` (tablas + constraints); `dbStorage.ts::seedDatabase`. |
| **Reutilizable** | Schema Drizzle; seed idempotente; dual adapter path. |
| **Temporal** | Sin migraciones formales; `db:push` referenciado pero inexistente; seed como único DDL. |
| **Preparación** | `drizzle.config.ts`; carpeta `migrations/`; scripts `db:generate`, `db:migrate`, `db:check`; esquema inicial reproducible. |
| **Servicio** | Aurora Serverless v2 + Data API (prod); PostgreSQL local (dev). |
| **Riesgo** | Medio — primera migración debe capturar todo el schema existente sin pérdida. |
| **Dependencia** | — |
| **Criterio** | Base vacía + migraciones = schema funcional; segunda aplicación no destruye datos. |

---

## 9. Data API

| Aspecto | Detalle |
|---------|---------|
| **Current** | Ruta en `db.ts` (`drizzle-aws-data-api/pg`) activa si `AWS_RDS_*` definidos; nunca probada contra Aurora real. |
| **Target** | Acceso preferido en Lambda; transacciones vía Data API; sin pools. |
| **Evidencia** | `db.ts::drizzleAws`, import de `@aws-sdk/client-rds-data`. |
| **Reutilizable** | Integración Drizzle-Data API. |
| **Temporal** | — |
| **Preparación** | Validar que migraciones funcionen con Data API (drizzle-kit connection); documentar diferencias de comportamiento. |
| **Servicio** | RDS Data API. |
| **Riesgo** | Medio — comportamiento de transacciones puede diferir de pg local. |
| **Dependencia** | Aurora SV2. |
| **Criterio** | Schema compatible; adapter funcional (se probará al desplegar). |

---

## 10. Migraciones

| Aspecto | Detalle |
|---------|---------|
| **Current** | No existen migraciones formales. Schema aplicado implícitamente (probablemente `drizzle-kit push`). Script `db:push` referenciado en mensajes de error pero **no existe** en package.json. |
| **Target** | Migraciones reproducibles (`drizzle-kit generate` → SQL versionado → `drizzle-kit migrate`). |
| **Evidencia** | Error messages en `auth.ts`, `idempotency.ts` mencionan `npm run db:push`. |
| **Reutilizable** | Schema declarativo en `shared/schema.ts`. |
| **Temporal** | Ausencia de tooling de migración. |
| **Preparación** | `drizzle.config.ts`; snapshot inicial; scripts npm; documentación de upgrade/rollback. |
| **Servicio** | PostgreSQL (local + Aurora). |
| **Riesgo** | Alto — sin migraciones, un deploy puede destruir datos. |
| **Dependencia** | — |
| **Criterio** | Scripts funcionales; base vacía llega al schema completo; re-aplicar es no-op. |

---

## 11. Archivos

| Aspecto | Detalle |
|---------|---------|
| **Current** | `attachments.ts`: decode base64 → `fs.writeFile` en `uploads/`; metadata en DB; servido por `express.static`; MIME/size validation; path-traversal guard. |
| **Target** | S3 + URLs prefirmadas; subida directa desde navegador; metadata en PostgreSQL; local solo para dev. |
| **Evidencia** | `attachments.ts::createAttachment`, `UPLOADS_DIR`, `express.static`. |
| **Reutilizable** | Validación MIME/size; metadata en DB; path-traversal guard (para local). |
| **Temporal** | `fs.writeFile`; base64-in-JSON (no presigned). |
| **Preparación** | Definir `AttachmentStorage` interface (`prepareUpload`, `confirmUpload`, `getDownloadAccess`, `deleteObject`, `verifyObject`); implementar `LocalAttachmentStorage`; variable `ATTACHMENTS_STORAGE_DRIVER`. |
| **Servicio** | S3. |
| **Riesgo** | Alto — cambio de flujo (presigned) afecta frontend y offline queue. |
| **Dependencia** | ADR 012; Spec #8. |
| **Criterio** | Interface definida; local funciona; S3 provider tipo-definido (no implementado). |

---

## 12. Idempotencia

| Aspecto | Detalle |
|---------|---------|
| **Current** | `idempotency.ts`: claim/complete/release; tabla `idempotency_keys` (PostgreSQL) con fallback en memoria; `SELECT FOR UPDATE` en DB; race condition documentada en Spike A. |
| **Target** | Garantía atómica: claim antes del efecto; efecto + registro en una unidad transaccional; máximo un efecto por key; confirmación perdida converge. |
| **Evidencia** | `idempotency.ts::claimDbOnce` (FOR UPDATE); `routes.ts::idempotent` wrapper. |
| **Reutilizable** | Estructura claim/complete/release; tabla; wrapper. |
| **Temporal** | `clearOrphanProcessingDb` elimina **todos** los processing al iniciar (puede perder claims válidos de otra instancia). |
| **Preparación** | Corregir orphan cleanup (expiración explícita, no borrado indiscriminado); asegurar atomicidad claim→efecto→complete; tests concurrentes (2, 10 simultáneos, fallo post-claim, confirmación perdida, 409 retry). |
| **Servicio** | PostgreSQL (tabla). |
| **Riesgo** | Alto — duplicación de efectos si la garantía falla. |
| **Dependencia** | — |
| **Criterio** | Tests pasan con concurrencia real; orphan handling por TTL; 409 reintentable. |

---

## 13. Offline

| Aspecto | Detalle |
|---------|---------|
| **Current** | Dexie queue; engine con backoff; reconciliación temp→real; idempotency-key; updates optimistas. |
| **Target** | Preservar offline; motor agnóstico al auth provider; base URL configurable; archivos vía presigned URL (futuro). |
| **Evidencia** | `web/src/lib/sync/engine.ts`, `queue.ts`, `db/idb.ts`. |
| **Reutilizable** | Todo el motor offline. |
| **Temporal** | `credentials: "include"` hardcodeado; base URL relativa. |
| **Preparación** | Auth header inyectado por AuthTokenProvider; base URL configurable; 409 handling respeta Retry-After. |
| **Servicio** | — (cliente). |
| **Riesgo** | Bajo — cambios en el wrapper de fetch, no en la lógica de cola. |
| **Dependencia** | API client prep (#11). |
| **Criterio** | Cola funciona con ambos providers; 409 respeta Retry-After. |

---

## 14. Mapas

| Aspecto | Detalle |
|---------|---------|
| **Current** | SVG/GeoJSON propio (`SpatialMap.tsx`); `useSpatialFeatures()` contra endpoint inexistente; métodos en `DbStorage` sin ruta. |
| **Target** | Endpoint `GET /api/spatial/features` + PATCH de geometría (Spec #4, no esta fase). |
| **Evidencia** | `spatial-gap-register.md`; `DbStorage::updateBlockGeometry` etc. |
| **Reutilizable** | Componente mapa; helpers espaciales; métodos DbStorage. |
| **Temporal** | Gap (endpoint no existe). |
| **Preparación** | No agravar el gap en esta fase. |
| **Servicio** | PostgreSQL (JSONB). |
| **Riesgo** | Bajo (no se toca). |
| **Dependencia** | Spec #4. |
| **Criterio** | Esta fase no introduce nuevas dependencias espaciales rotas. |

---

## 15. Observabilidad

| Aspecto | Detalle |
|---------|---------|
| **Current** | Logger JSON estructurado (`logger.ts`); request IDs; levels; stderr para error/warn. |
| **Target** | CloudWatch Logs (natural en Lambda); health/readiness checks; métricas básicas (futuro). |
| **Evidencia** | `logger.ts::emit`, `requestLogger`. |
| **Reutilizable** | Logger completo; request ID propagation. |
| **Temporal** | Sin health/ready endpoints formales (hay `/health` ambiguo). |
| **Preparación** | `GET /health/live` (proceso activo); `GET /health/ready` (config+schema+storage). |
| **Servicio** | CloudWatch. |
| **Riesgo** | Bajo. |
| **Dependencia** | — |
| **Criterio** | Endpoints live/ready implementados; Lambda init fail-closed. |

---

## 16. Secretos

| Aspecto | Detalle |
|---------|---------|
| **Current** | Variables de entorno planas; `.env.example` con placeholders; `SESSION_SECRET` efímero en dev. |
| **Target** | Secrets Manager para `SESSION_SECRET`, credenciales DB, Cognito secrets; variables no secretas por Parameter Store o env. |
| **Evidencia** | `env.ts::loadEnv`; `.env.example`. |
| **Reutilizable** | Estructura de env parsing; validación. |
| **Temporal** | Secreto efímero en dev (aceptable). |
| **Preparación** | Documentar qué variables van a Secrets Manager; config fail-closed en prod (ya parcialmente implementado: prod exige `DATABASE_URL` o `AWS_RDS_*`). |
| **Servicio** | Secrets Manager. |
| **Riesgo** | Bajo. |
| **Dependencia** | — |
| **Criterio** | Documentación clara; prod no arranca con secretos inseguros. |

---

## 17. CI

| Aspecto | Detalle |
|---------|---------|
| **Current** | GitHub Actions (`ci.yml`): clean/format/lint/typecheck/test/build en ubuntu-latest + Node 20; no DB. |
| **Target** | Mantener gates actuales + añadir job de integración con PostgreSQL (service container). |
| **Evidencia** | `.github/workflows/ci.yml`. |
| **Reutilizable** | Workflow actual completo. |
| **Temporal** | — |
| **Preparación** | Añadir job `integration` con PostgreSQL service, migraciones, seed, tests de integración (idempotencia concurrente). |
| **Servicio** | GitHub Actions (PostgreSQL service container). |
| **Riesgo** | Bajo. |
| **Dependencia** | Migraciones (#8). |
| **Criterio** | Job pasa con migraciones + tests de idempotencia concurrente. |

---

## 18. Bedrock

| Aspecto | Detalle |
|---------|---------|
| **Current** | No implementado; documentado como diferenciador futuro. |
| **Target** | Bedrock con tool calling; solo lectura primero; RBAC; confirmación humana. |
| **Evidencia** | `docs/architecture/farm-assistant-plan.md`. |
| **Reutilizable** | — (no hay código). |
| **Temporal** | — |
| **Preparación** | Ninguna en esta fase (requiere Spec propia). |
| **Servicio** | Bedrock. |
| **Riesgo** | — (no se toca). |
| **Dependencia** | Spec #13. |
| **Criterio** | No se introduce código muerto de Bedrock. |

---

## 19. EventBridge

| Aspecto | Detalle |
|---------|---------|
| **Current** | No implementado; limpiezas inline probabilísticas. |
| **Target** | EventBridge Scheduler para tareas periódicas (limpieza TTL, refresco clima). |
| **Evidencia** | `idempotency.ts::CLEANUP_PROBABILITY`; `weather.ts` (cache TTL inline). |
| **Reutilizable** | — |
| **Temporal** | Cleanup inline (suficiente para MVP). |
| **Preparación** | Definir `TaskScheduler` interface solo si hay dependencia real en esta fase. No implementar sin necesidad. |
| **Servicio** | EventBridge Scheduler. |
| **Riesgo** | — (no se toca). |
| **Dependencia** | — |
| **Criterio** | No se introduce código muerto de EventBridge. |

---

## 20. SQS

| Aspecto | Detalle |
|---------|---------|
| **Current** | No implementado. |
| **Target** | SQS para trabajo asíncrono (notificaciones, procesamiento batch). |
| **Evidencia** | — |
| **Reutilizable** | — |
| **Temporal** | — |
| **Preparación** | Ninguna en esta fase. |
| **Servicio** | SQS. |
| **Riesgo** | — |
| **Dependencia** | Spec de mensajería/notificaciones. |
| **Criterio** | No se introduce código muerto de SQS. |

---

## 21. SES

| Aspecto | Detalle |
|---------|---------|
| **Current** | No implementado. |
| **Target** | SES para notificaciones por email. |
| **Evidencia** | — |
| **Reutilizable** | — |
| **Temporal** | — |
| **Preparación** | Definir `NotificationPublisher` interface solo si hay dependencia real. |
| **Servicio** | SES. |
| **Riesgo** | — |
| **Dependencia** | — |
| **Criterio** | No se introduce código muerto de SES. |

---

## 22. Textract

| Aspecto | Detalle |
|---------|---------|
| **Current** | No implementado; ADR 005 (Deferred). Variable `TEXTRACT_ENABLED` en `.env.example` histórico (no leída por código). |
| **Target** | Candidato primario para extracción documental; benchmark contra Azure DI. |
| **Evidencia** | ADR 005 (Deferred); `.env.example` (deferred section). |
| **Reutilizable** | — |
| **Temporal** | — |
| **Preparación** | Definir `DocumentExtractionProvider` interface con resultado canónico; variable `DOCUMENT_EXTRACTION_PROVIDER=none|textract|azure`. |
| **Servicio** | Textract. |
| **Riesgo** | Bajo (no se implementa). |
| **Dependencia** | ADR 013; Spec futura de benchmark. |
| **Criterio** | Interface definida; provider stub `none` funcional. |

---

## 23. Azure AI Document Intelligence

| Aspecto | Detalle |
|---------|---------|
| **Current** | No implementado; variables en `.env.example` (deferred section). |
| **Target** | Candidato comparativo para extracción; benchmark contra Textract; AWS sigue siendo eje principal. |
| **Evidencia** | ADR 005 (menciona Azure como comparativo). |
| **Reutilizable** | — |
| **Temporal** | — |
| **Preparación** | Misma `DocumentExtractionProvider` interface; variable `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT/KEY`. |
| **Servicio** | Azure AI Document Intelligence. |
| **Riesgo** | Bajo (no se implementa). |
| **Dependencia** | ADR 013. |
| **Criterio** | Interface cubre ambos providers; ninguno activado. |

---

## Status Matrix & Verification Summary

| Component / Boundary | Status | Implementation Details | Evidence / Verification |
|----------------------|--------|------------------------|-------------------------|
| **Transactional Idempotency** | `verified` / `locally verified` | Atomic single-transaction PostgreSQL claim + business mutation + completion (`claimTx` / `completeTx` / `withTransaction`). Client sync engine handles `IDEMPOTENCY_IN_PROGRESS` (409) and respects `Retry-After`. | `idempotency.ts`, `routes.ts`, `engine.ts`, `idempotency.postgres.test.ts` (10/10 PASS) |
| **PostgreSQL Integration Suite** | `locally verified` / `CI pending` | 10 mandatory real concurrency test cases + clean DB migration/seed test against synthetic PostgreSQL instance. Prepared for CI job `integration-postgres`. | `idempotency.postgres.test.ts`, `migrations.postgres.test.ts`, `vitest.integration.config.ts`, `.github/workflows/ci.yml` |
| **IdentityProvider Boundary** | `wired` (`locally verified`) | `LocalSessionIdentityProvider` wired via `getProviders().identity.resolve` in `auth.ts`. Produces canonical `IdentityPrincipal` without exposing cookie structure to domain handlers. | `auth.ts`, `providers/identity/local-session.ts` |
| **AttachmentStorage Boundary** | `wired` (`locally verified`) | `LocalAttachmentStorage` wired in `attachments.ts` via `getProviders().attachments`. Upload and deletion flow through single storage path. | `attachments.ts`, `providers/attachments/local.ts` |
| **DocumentExtractionProvider** | `scaffold-only` | `NoOpDocumentExtraction` stub active. Remote AWS Textract / Azure DI remain unimplemented until future spec. | `providers/documents/noop.ts` |
| **Config Fail-Closed Validation** | `verified` | Environment validation rules reject invalid prod configurations (`local-session` in prod, missing S3 bucket, missing Cognito keys). | `env.ts`, `test/config.test.ts` |
| **Lambda Import Isolation** | `verified` | `app.ts` contains zero Vite imports. `server.ts` handles dev/standalone server. `handlers/index.ts` imports `app.ts` directly. | `app.ts`, `server.ts`, `handlers/index.ts` |
| **Health Checks (/live & /ready)** | `verified` | `/health/live` returns process liveness. `/health/ready` validates initialization and schema access without exposing secrets. | `health.ts`, `test/health.test.ts` |
| **Data API Migration Strategy** | `documented` | Architecture lifecycle recorded detailing local/CI vs AWS Aurora Data API runner, IAM permissions, advisory locks, and zero-downtime policy. | `docs/architecture/database-deployment-lifecycle.md` |

---

### Verified Platform Status

> Cloud-service boundaries prepared.
> Local development remains functional.
> Production deployment requires Cognito, S3 and AWS infrastructure.
