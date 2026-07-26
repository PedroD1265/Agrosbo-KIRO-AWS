# AGROSBO — Auditoría de Capacidades v2

> Fecha de auditoría: julio 2026.
> Rama: `docs/product-agent-scope-v2`.
> Base: commit `8b9d7ba`.
> Fuente canónica de alcance:
> [`../product/product-scope-v2.md`](../product/product-scope-v2.md).

## 1. Baseline verificado

Baseline previo a los cambios documentales de Fase 0. Actualmente existen
archivos documentales untracked conocidos producidos por los checkpoints 0.2–0.4.

| Dato | Valor |
| --- | --- |
| Working tree (baseline pre-Fase 0) | Limpio |
| format | PASS |
| check:encoding | PASS |
| lint | 0 errores / 154 warnings preexistentes |
| typecheck | PASS |
| Pruebas unitarias | 132 PASS |
| Pruebas MemStorage HTTP | 7 PASS |
| Pruebas integración PostgreSQL | 26 PASS |
| **Total pruebas** | **165** |
| build | PASS |
| db:check | PASS |
| cloud-services-readiness (PR #2) | Fusionada en main |
| Despliegue AWS | Ninguno |

## 2. Definiciones de estado

| Estado | Significado |
| --- | --- |
| IMPLEMENTED | Código funcional, ruta API, persistencia y/o UI verificados en el repositorio |
| PARTIAL | Algunos componentes existen; flujo completo no funciona o falta integración |
| PLACEHOLDER | Interface/scaffold definido; implementación arroja error o es noop sin funcionalidad real |
| DOCUMENTED_ONLY | Descrito en documentación pero sin código funcional ni artefacto operativo |
| MISSING | Sin código funcional ni documentación operativa específica |

Notas adicionales:

- PLANNED P0 / PLANNED P1 se usan como horizonte aprobado, no como evidencia de
  implementación.
- "Implementado en código" no implica "desplegado en AWS" ni "verificado contra
  servicios reales".
- "Mutación offline" significa que la cola Dexie encola la operación con
  X-Idempotency-Key; no implica lectura durable offline de los datos resultantes.

## 3. Matriz de capacidades — Dominios agrícolas

| Capacidad | Estado | Evidencia | API | UI | Persistencia | Tests | Mutación offline (cola Dexie) | Lectura offline | MemStorage | Desplegado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bloques CRUD | IMPLEMENTED | `api/src/routes.ts` (GET/POST/PATCH/DELETE /blocks), `storage.ts` IStorage, `dbStorage.ts` | Sí | Blocks.tsx, BlockDetail.tsx | PG + Mem | Sí (unit + integration) | Sí | Solo memoria de sesión | Sí | No |
| Invernaderos CRUD | IMPLEMENTED | `routes.ts` (/greenhouses), `storage.ts` | Sí | Greenhouses.tsx, GreenhouseDetail.tsx | PG + Mem | Sí | Sí | Solo memoria de sesión | Sí | No |
| Campañas CRUD + resumen | IMPLEMENTED | `routes.ts` (/campaigns, /campaigns/:id/summary), `campaignSummary.ts` | Sí | Campaigns.tsx, CampaignDetail.tsx | PG + Mem | Sí | Sí | Solo memoria de sesión | Sí | No |
| Tareas CRUD + status | IMPLEMENTED | `routes.ts` (/tasks, /tasks/:id/status), `storage.ts` | Sí | Tasks.tsx, Today.tsx | PG + Mem | Sí | Sí | Solo memoria de sesión | Sí | No |
| Observaciones CRUD | IMPLEMENTED | `routes.ts` (/observations, /observations/:id/tasks) | Sí | Observations.tsx | PG + Mem | Sí | Sí | Solo memoria de sesión | Sí | No |
| Riego CRUD + mark done | IMPLEMENTED | `routes.ts` (/irrigation-events, /:id/done) | Sí | Irrigation.tsx, Today.tsx | PG + Mem | Sí | Sí | Solo memoria de sesión | Sí | No |
| Irrigation Advisor | IMPLEMENTED | `irrigationAdvisor.ts` (función pura buildIrrigationAdvice), `routes.ts` (/irrigation/advice) | Sí | Irrigation.tsx | N/A (derivado) | Sin prueba dedicada | No (requiere red) | No | N/A | No |
| Inventario + Movimientos | IMPLEMENTED | `routes.ts` (/inventory, /inventory/:id, /inventory-movements), transacción en `dbStorage.ts` | Sí | Inventory.tsx | PG + Mem | Sí (stock constraint) | Sí | Solo memoria de sesión | Sí | No |
| Cosecha | IMPLEMENTED | `routes.ts` (/harvest-lots) | Sí | Harvest.tsx | PG + Mem | Sí | Sí | Solo memoria de sesión | Sí | No |
| Aplicaciones fitosanitarias | IMPLEMENTED | `applications.ts` (listApplications, createApplication), `routes.ts` | Sí | Applications.tsx | PG ONLY | Sí | Sí | Solo memoria de sesión | No | No |
| Apicultura | IMPLEMENTED | `beekeeping.ts`, `routes.ts` (/apiaries, /hives, /hive-inspections, /honey-harvests) | Sí | Beekeeping.tsx | PG ONLY | Sí | Sí | Solo memoria de sesión | No | No |
| Gastos + Mano de obra | IMPLEMENTED | `expenses.ts`, `routes.ts` (/expenses, /labor-costs, /campaigns/:id/costs, /scope-costs) | Sí | Expenses.tsx | PG ONLY | Sí | Sí | Solo memoria de sesión | No | No |
| Adjuntos (disco local) | IMPLEMENTED | `attachments.ts`, `providers/attachments/local.ts`, `routes.ts` (/attachments) | Sí | AttachmentUploader.tsx | PG + disco local | Sí (21 unit) | Sí (base64 en JSON) | No | No | No |
| Clima (Open-Meteo) | IMPLEMENTED | `weather.ts` (fetchOpenMeteo, cache dual), `routes.ts` (/weather/forecast) | Sí | WeatherStrip.tsx | Cache mem + tabla weatherCache | Sin prueba dedicada | No (requiere red) | No | N/A | No |
| Alertas derivadas | IMPLEMENTED | `alertsEngine.ts` (deriveAlerts), `routes.ts` (/alerts) | Sí | Today.tsx, AlertBanner | Derivadas en runtime (no persistidas) | Sí (5 tests en `web/src/test/alertsEngine.test.ts`) | No (server-side) | No | N/A | No |
| Reportes CSV | IMPLEMENTED | `reports.ts`, `csv.ts`, `routes.ts` (/reports/*.csv, /integrations/export/:dataset) | Sí | Reports.tsx, ExportPanel.tsx | Server-side generation | Sin prueba dedicada | No | No | No (exports parcial vía IStorage) | No |
| CSV Import | IMPLEMENTED | `csv.ts` (parseAndImport), `routes.ts` (/integrations/import/:dataset) | Sí | ImportPanel.tsx | Vía IStorage | Sin prueba dedicada | No | No | Parcial | No |
| Catálogo de cultivos | IMPLEMENTED | `shared/cropCatalog.ts`, `routes.ts` (/crops) | Sí | Campañas, Advisor | Estático en código | Sin prueba dedicada | No (estático) | Estático en bundle | N/A | No |
| Settings | IMPLEMENTED | `routes.ts` (/settings), `storage.ts` | Sí | Settings.tsx | PG + Mem | Sí | Sí | Solo memoria de sesión | Sí | No |
| Adapter Registry | IMPLEMENTED | `adapters.ts`, `routes.ts` (/integrations/adapters) | Sí | Integrations.tsx | Memoria | Sin prueba dedicada | No | No | N/A | No |

## 4. Matriz de capacidades — Plataforma e infraestructura

| Capacidad | Estado | Evidencia | Desplegado | Observación |
| --- | --- | --- | --- | --- |
| Auth cookie HMAC + RBAC | IMPLEMENTED | `api/src/auth.ts` (encodeToken, decodeToken, attachUser, requireRole), `users.ts` (scrypt) | No | 5 roles; revocación persistente |
| Provider: local-session identity | IMPLEMENTED | `providers/identity/local-session.ts` (LocalSessionIdentityProvider) | No (solo local/dev) | Produce IdentityPrincipal canónico |
| Provider: Cognito JWT | PLACEHOLDER | `providers/index.ts` línea 66: `throw new Error('cognito-jwt ... not yet implemented')` | No | Interface definida; sin implementación |
| Provider: local attachments | IMPLEMENTED | `providers/attachments/local.ts` (LocalAttachmentStorage) | No (solo local/dev) | Escribe en disco `uploads/` |
| Provider: S3 attachments | PLACEHOLDER | `providers/index.ts` línea 77: `throw new Error('S3 ... not yet implemented')` | No | Interface definida; sin implementación |
| Provider: document extraction (noop) | PLACEHOLDER | `providers/documents/noop.ts` (NoOpDocumentExtraction) | No | Stub funcional; capacidad real de extracción ausente |
| Provider: Textract | PLACEHOLDER | `providers/index.ts` línea 85: `throw new Error('Textract ... not yet implemented')` | No | Interface definida; sin implementación |
| Provider: Azure DI | PLACEHOLDER | `providers/index.ts` línea 90: `throw new Error('Azure ... not yet implemented')` | No | Interface definida; sin implementación |
| Health checks (live + ready) | IMPLEMENTED | `health.ts` (registerHealthRoutes, markReady, isReady) | No | Liveness + readiness con DB check |
| Idempotencia HTTP atómica | IMPLEMENTED | `idempotency.ts` (claim/complete/release, claimTx/completeTx), tabla `idempotency_keys` | No | DB transaccional + fallback mem; 10+ tests |
| Lambda adapter | IMPLEMENTED | `handlers/index.ts` (`@vendia/serverless-express`, fail-closed setup) | No; no verificado contra AWS | Código funcional; nunca ejecutado en Lambda real |
| CDK stack | PLACEHOLDER | `infra/src/index.ts` = `export {}` | No | Archivo vacío |
| DB dual-path (pg + Data API) | PARTIAL | `db.ts` (proxy con drizzlePg + drizzleAws) | Solo PG local verificado; Data API nunca probado contra Aurora | PG local funcional; camino Data API existe en código pero sin validación AWS real |
| Migraciones Drizzle | IMPLEMENTED | `api/migrations/` (2 archivos SQL), `drizzle.config.ts`, scripts npm | Solo PG local | CI ejecuta db:migrate + db:check |
| CI (GitHub Actions) | IMPLEMENTED | `.github/workflows/ci.yml` (quality-gates + integration-postgres) | Sí (GitHub-hosted) | 165 tests en CI |
| PWA Service Worker | IMPLEMENTED | `web/public/sw.js` (network-first nav, SWR assets, network-only API) | No | Shell + assets cacheados; API no cacheada |
| Cola offline (Dexie) | IMPLEMENTED | `web/src/lib/db/idb.ts`, `web/src/lib/sync/queue.ts` | N/A (client-side) | 40+ tipos de mutación; persistencia en IndexedDB |
| Sync engine | IMPLEMENTED | `web/src/lib/sync/engine.ts` (processQueueOnce, backoff, idMap) | N/A (client-side) | Backoff exponencial, reconciliación, 401 handling |
| API client (base URL + auth provider) | IMPLEMENTED | `web/src/lib/api-config.ts` (resolveApiUrl, buildFetchInit, AuthTokenProvider) | No | Solo local-session provider funcional |
| Frontend auth context | IMPLEMENTED | `web/src/lib/auth.tsx` (AuthProvider, useAuth, login, logout) | No | Cookie-based; RequireAuth con roles |
| Frontend permissions | IMPLEMENTED | `web/src/lib/permissions.ts` (ROLE_PERMISSIONS, usePermissions) | No | 5 permisos × 5 roles |

## 5. Capacidades espaciales

| Capacidad | Estado | Evidencia |
| --- | --- | --- |
| Mapa SVG (visualización) | PARTIAL | `web/src/components/map/SpatialMap.tsx` renderiza polígonos de bloques/greenhouses que ya tengan boundary/footprint |
| GET /api/spatial/features | MISSING | `hooks/data/index.ts` useSpatialFeatures referencia endpoint inexistente en `routes.ts` |
| PATCH /api/blocks/:id/geometry | MISSING | `mutations.ts` queueUpdateBlockGeometry apunta a ruta inexistente |
| PATCH /api/greenhouses/:id/location | MISSING | `mutations.ts` queueUpdateGreenhouseLocation apunta a ruta inexistente |
| PATCH /api/observations/:id/location | MISSING | `mutations.ts` queueUpdateObservationLocation apunta a ruta inexistente |
| POST /api/spatial/blocks/import | MISSING | `mutations.ts` queueImportBlockBoundaries apunta a ruta inexistente |
| DbStorage métodos espaciales | PARTIAL | Métodos existen en DbStorage; sin ruta HTTP que los exponga |
| Helpers espaciales (shared) | IMPLEMENTED | `shared/spatial.ts` (schemas, geo helpers, patch contracts) |

> Los endpoints espaciales faltantes quedan fuera de Fase 0 y se registran para
> Spec técnica posterior.

## 6. Capacidades P0 — Estado actual

| Capacidad P0 | Estado actual | Horizonte | Evidencia |
| --- | --- | --- | --- |
| Agente operacional | DOCUMENTED_ONLY | PLANNED P0 | `docs/architecture/farm-assistant-plan.md` existe (obsoleto, será superseded); ningún código funcional |
| Voz (STT/TTS) | MISSING | PLANNED P0 | Ningún componente |
| Amazon SES | DOCUMENTED_ONLY | PLANNED P0 | Aparece en `docs/architecture/aws-service-plan.md`; ningún código funcional |
| Colaboradores externos | MISSING | PLANNED P0 | Ningún modelo ni UI |
| Enlaces seguros | MISSING | PLANNED P0 | Ningún modelo |
| Evaluación visual (fotos) | MISSING | PLANNED P0 | Ningún procesamiento de imágenes |
| IrrigationDelayScenario | MISSING | PLANNED P0 | Motor de escenarios no existe; IrrigationAdvisor es heurística simple |
| Despliegue AWS completo | PLACEHOLDER | PLANNED P0 | CDK scaffold vacío (`infra/src/index.ts` = `export {}`); componentes base existen (Lambda adapter, db dual-path, providers boundary, health checks) pero no hay stack funcional ni recursos desplegados |
| Cognito en producción | PLACEHOLDER | PLANNED P0 | Interface definida; throws "not implemented" |
| S3 para adjuntos | PLACEHOLDER | PLANNED P0 | Interface definida; throws "not implemented" |

## 7. Capacidades P1 — Estado actual

| Capacidad P1 | Estado actual | Horizonte |
| --- | --- | --- |
| Tienda pública por finca | MISSING | PLANNED P1 |
| URL pública y QR | MISSING | PLANNED P1 |
| Solicitudes de compra sin registro | MISSING | PLANNED P1 |
| Comparación de interesados | MISSING | PLANNED P1 |
| WhatsApp wa.me prellenado | MISSING | PLANNED P1 |
| Notas de voz offline | MISSING | PLANNED P1 |
| Resumen hablado del día | MISSING | PLANNED P1 |

## 8. Limitaciones de MemStorage

MemStorage (`api/src/storage.ts` clase MemStorage) cubre **solo** el core de
IStorage:

- blocks, greenhouses, campaigns, irrigation, tasks, observations, inventory +
  movements, harvest, settings, alerts.

**NO cubre** (requieren PostgreSQL, acceden a `db` directamente):

| Dominio | Archivo | Comportamiento sin PG |
| --- | --- | --- |
| Aplicaciones fitosanitarias | `applications.ts` | Retorna [] |
| Gastos y mano de obra | `expenses.ts` | DATABASE_REQUIRED (503) |
| Apicultura | `beekeeping.ts` | Retorna [] |
| Adjuntos | `attachments.ts` | DATABASE_REQUIRED (503) |
| Usuarios | `users.ts` | DATABASE_REQUIRED (503) |
| Reportes avanzados CSV | `reports.ts` | DATABASE_REQUIRED (503) |
| Weather cache DB | `weather.ts` | Cache memoria funciona; DB no |

## 9. Contradicciones documentales detectadas

| # | Archivo | Problema | Estado real | Corrección (Bloque) |
| --- | --- | --- | --- | --- |
| 1 | `README.md` §23 | "60/60 tests" | 165 tests | Bloque 3 |
| 2 | `docs/spec-map.md` Spec 1b | "en curso" y "60/60 tests" | PR #2 fusionada; 165 | Bloque 3 |
| 3 | `README.md` §3 | cloud-readiness como "Being stabilized" | Completada | Bloque 3 |
| 4 | `.kiro/steering/tech.md` | "Amplify Hosting" como target | S3+CF+OAC | Bloque 3 |
| 5 | `.kiro/steering/hackathon-scope.md` | "Amplify Hosting" | S3+CF+OAC | Bloque 3 |
| 6 | `docs/architecture/aws-service-plan.md` | Amplify obligatorio; CF diferido; SES future | CF obligatorio; Amplify descartado; SES P0 | Bloque 3 |
| 7 | `docs/architecture/farm-assistant-plan.md` | Agente "solo lectura, futuro" | P0 requiere agente multimodal con mutaciones | Bloque 2 (supersesión) |
| 8 | `.kiro/steering/product.md` | "Consulta conversacional (solo lectura)" | P0 incluye mutaciones con confirmación | Bloque 3 |
| 9 | `docs/product/hackathon-demo-story.md` | Pasos 14-19 como "roadmap lejano" | Agente es P0 obligatorio | Bloque 3 |
| 10 | `docs/architecture/aws-service-plan.md` | SES como "future/diferido" | SES obligatorio P0 | Bloque 3 |

## 10. Gaps técnicos (NO se corrigen en Fase 0)

| # | Gap | Ubicación | Impacto |
| --- | --- | --- | --- |
| 1 | 5 endpoints espaciales faltantes | `mutations.ts` → `routes.ts` | Mutaciones de geometría: 404 → failed |
| 2 | MemStorage no cubre 6 dominios | `storage.ts` vs módulos directos | Dev sin PG no prueba esos dominios |
| 3 | `useSpatialFeatures()` contra endpoint inexistente | `hooks/data/index.ts` | Error silencioso en mapa |
| 4 | campaigns/:id/summary usa `storage` global | `routes.ts` | Inconsistencia en transacciones (menor) |
| 5 | 154 ESLint warnings | Todo el workspace | Ruido, no bloquea |

## 11. Archivos principales inspeccionados

- **Raíz**: `package.json`, `.env.example`, `.github/workflows/ci.yml`, `README.md`
- **Infra**: `infra/package.json`, `infra/src/index.ts`
- **Shared**: `schema.ts`, `spatial.ts`, `cropCatalog.ts`
- **Backend**: `app.ts`, `routes.ts`, `auth.ts`, `users.ts`, `db.ts`,
  `dbStorage.ts`, `storage.ts`, `idempotency.ts`, `health.ts`, `env.ts`,
  `logger.ts`, `applications.ts`, `alertsEngine.ts`, `weather.ts`,
  `irrigationAdvisor.ts`, `campaignSummary.ts`, `reports.ts`, `csv.ts`,
  `attachments.ts`, `expenses.ts`, `beekeeping.ts`, `adapters.ts`,
  `handlers/index.ts`, `providers/` (todos), `transaction-compensations.ts`
- **Frontend**: `pages/` (22), `features/` (today, tasks, reports, integrations,
  settings), `components/map/SpatialMap.tsx`, `hooks/data/` (index, mutations),
  `lib/sync/` (engine, queue, useQueueStatus), `lib/db/idb.ts`, `lib/auth.tsx`,
  `lib/permissions.ts`, `lib/api-config.ts`, `lib/queryClient.ts`,
  `test/alertsEngine.test.ts`
- **PWA**: `web/public/sw.js`
- **Docs**: todo `docs/` y `.kiro/`
