# AGROSBO — Matriz de Estado de Capacidades

> Fuente canónica de alcance:
> [`./product-scope-v2.md`](./product-scope-v2.md).
>
> Auditoría de referencia:
> [`../reviews/current-capability-audit-v2.md`](../reviews/current-capability-audit-v2.md).
>
> Última actualización: julio 2026 (Fase 0, Checkpoint 0.4).

## Definiciones de estado

| Estado | Significado |
| --- | --- |
| IMPLEMENTED | Código funcional, ruta API, persistencia y/o UI verificados |
| PARTIAL | Algunos componentes existen; flujo completo no funciona |
| PLACEHOLDER | Interface/scaffold definido; implementación arroja error o es noop |
| DOCUMENTED_ONLY | Descrito en docs pero sin código funcional |
| MISSING | Sin código funcional ni artefacto operativo |
| PLANNED P0 | Horizonte aprobado P0; no implementado |
| PLANNED P1 | Horizonte aprobado P1; no implementado |
| OUT OF SCOPE/P2 | Fuera del alcance obligatorio |
| FUTURE SPEC | Deuda técnica futura sin número de Spec aprobado; fuera de Fase 0; no asignada actualmente a P0/P1; no bloquea P0 ni el golden path |

## Definiciones de offline

| Columna | Significado |
| --- | --- |
| Mutación offline | La operación se encola en IndexedDB (Dexie) con X-Idempotency-Key |
| Lectura offline | Dato disponible sin conexión: "sesión" = solo memoria React Query de la sesión actual; "cache SW" = shell/assets; "durable" = persistido en IndexedDB; "no" = requiere red |
| Desplegado | Si la capacidad está funcionando en un ambiente AWS real |

## Dominios agrícolas — CURRENT

| Capacidad | Estado | Horizonte | API | UI | PG | Mem | Tests | Mutación offline | Lectura offline | Desplegado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bloques CRUD | IMPLEMENTED | CURRENT | /blocks | Blocks, BlockDetail | Sí | Sí | Sí | Sí | Sesión | No |
| Invernaderos CRUD | IMPLEMENTED | CURRENT | /greenhouses | Greenhouses, Detail | Sí | Sí | Sí | Sí | Sesión | No |
| Campañas CRUD + resumen | IMPLEMENTED | CURRENT | /campaigns | Campaigns, Detail | Sí | Sí | Sí | Sí | Sesión | No |
| Tareas CRUD + status | IMPLEMENTED | CURRENT | /tasks | Tasks, Today | Sí | Sí | Sí | Sí | Sesión | No |
| Observaciones CRUD | IMPLEMENTED | CURRENT | /observations | Observations | Sí | Sí | Sí | Sí | Sesión | No |
| Riego CRUD + mark done | IMPLEMENTED | CURRENT | /irrigation-events | Irrigation, Today | Sí | Sí | Sí | Sí | Sesión | No |
| Irrigation Advisor | IMPLEMENTED | CURRENT | /irrigation/advice | Irrigation | N/A | N/A | Sin dedicado | No | No | No |
| Inventario + Movimientos | IMPLEMENTED | CURRENT | /inventory | Inventory | Sí | Sí | Sí | Sí | Sesión | No |
| Cosecha | IMPLEMENTED | CURRENT | /harvest-lots | Harvest | Sí | Sí | Sí | Sí | Sesión | No |
| Aplicaciones fitosanitarias | IMPLEMENTED | CURRENT | /applications | Applications | Sí | No | Sí | Sí | Sesión | No |
| Apicultura | IMPLEMENTED | CURRENT | /apiaries, /hives, etc. | Beekeeping | Sí | No | Sí | Sí | Sesión | No |
| Gastos + Mano de obra | IMPLEMENTED | CURRENT | /expenses, /labor-costs | Expenses | Sí | No | Sí | Sí | Sesión | No |
| Adjuntos (disco local) | IMPLEMENTED | CURRENT | /attachments | AttachmentUploader | Sí + disco | No | Sí (21) | Sí (base64) | No | No |
| Clima (Open-Meteo) | IMPLEMENTED | CURRENT | /weather/forecast | WeatherStrip | Cache | N/A | Sin dedicado | No | No | No |
| Alertas derivadas | IMPLEMENTED | CURRENT | /alerts | Today, AlertBanner | Runtime | N/A | Sí (5) | No | No | No |
| Reportes CSV | IMPLEMENTED | CURRENT | /reports/*.csv | Reports | Sí | No | Sin dedicado | No | No | No |
| Settings | IMPLEMENTED | CURRENT | /settings | Settings | Sí | Sí | Sí | Sí | Sesión | No |

## Plataforma e infraestructura — CURRENT

| Capacidad | Estado | Horizonte | Desplegado | Observación |
| --- | --- | --- | --- | --- |
| Auth cookie HMAC + RBAC (5 roles) | IMPLEMENTED | CURRENT | No | Funcional en dev/test |
| Provider: local-session identity | IMPLEMENTED | CURRENT | No | Solo dev/test |
| Provider: Cognito JWT | PLACEHOLDER | PLANNED P0 | No | Throws "not implemented" |
| Provider: local attachments | IMPLEMENTED | CURRENT | No | Solo dev/test |
| Provider: S3 attachments | PLACEHOLDER | PLANNED P0 | No | Throws "not implemented" |
| Provider: document extraction (noop) | PLACEHOLDER | CURRENT | No | Stub noop; capacidad real ausente |
| Provider: Textract | PLACEHOLDER | FUTURE SPEC | No | Heredado; no obligatorio P0; alcance diferido (ADR 013) |
| Health checks (live + ready) | IMPLEMENTED | CURRENT | No | Funcional |
| Idempotencia HTTP atómica | IMPLEMENTED | CURRENT | No | DB + mem; tests de concurrencia |
| Lambda adapter | IMPLEMENTED | CURRENT | No | Código funcional; no verificado en AWS |
| CDK stack | PLACEHOLDER | PLANNED P0 | No | Archivo vacío |
| DB dual-path (pg + Data API) | PARTIAL | CURRENT | Solo PG local | PG local verificado; Data API existe en código pero no probado contra Aurora real |
| Migraciones Drizzle | IMPLEMENTED | CURRENT | Solo PG local | CI las ejecuta |
| CI (GitHub Actions) | IMPLEMENTED | CURRENT | GitHub | 165 tests |
| PWA Service Worker | IMPLEMENTED | CURRENT | No | Shell + assets cacheados |
| Cola offline (Dexie, 40+ tipos) | IMPLEMENTED | CURRENT | N/A | Mutaciones durables en IndexedDB |
| Sync engine + reconciliación | IMPLEMENTED | CURRENT | N/A | Backoff, idMap, 401 handling |
| API client (base URL + auth) | IMPLEMENTED | CURRENT | No | Solo local-session funcional |
| Mapa SVG (visualización) | PARTIAL | CURRENT | No | Renderiza datos existentes; endpoints faltantes |
| Endpoints espaciales (5 rutas) | MISSING | FUTURE SPEC | No | Deuda técnica futura; fuera de Fase 0; no bloquea P0; no forma parte del golden path P0; número de Spec no aprobado |

## Capacidades P0 — PLANNED

| Capacidad | Estado actual | Horizonte | Componentes base existentes |
| --- | --- | --- | --- |
| Despliegue AWS (CDK completo) | PLACEHOLDER | PLANNED P0 | CDK scaffold vacío; Lambda adapter, db dual-path, providers boundary, health checks |
| Agente operacional | DOCUMENTED_ONLY | PLANNED P0 | Arquitectura activa en docs/architecture/operational-agent-plan.md; farm-assistant-plan.md SUPERSEDED; ningún código funcional |
| Consultas por texto | MISSING | PLANNED P0 | — |
| Entrada por voz (Transcribe) | MISSING | PLANNED P0 | — |
| Respuestas habladas (Polly) | MISSING | PLANNED P0 | — |
| Navegación visible | MISSING | PLANNED P0 | React Router existente |
| Borradores + confirmación | MISSING | PLANNED P0 | Cola offline + idempotencia (reutilizable) |
| Colaboradores internos (CRUD avanzado) | PARTIAL | PLANNED P0 | Users CRUD + RBAC existentes |
| Colaboradores externos | MISSING | PLANNED P0 | — |
| Amazon SES | DOCUMENTED_ONLY | PLANNED P0 | Aparece en documentación (aws-service-plan.md); ningún código funcional |
| Enlaces seguros | MISSING | PLANNED P0 | — |
| Evaluación visual (Bedrock) | MISSING | PLANNED P0 | Attachments upload existente |
| IrrigationDelayScenario | MISSING | PLANNED P0 | IrrigationAdvisor (datos reutilizables) |
| Cognito en producción | PLACEHOLDER | PLANNED P0 | Interface + AuthTokenProvider abstraction |
| S3 para adjuntos | PLACEHOLDER | PLANNED P0 | Interface + AttachmentStorage abstraction |
| Golden path reproducible | MISSING | PLANNED P0 | Seed idempotente + demo-story |

## Capacidades P1 — PLANNED

| Capacidad | Estado actual | Horizonte |
| --- | --- | --- |
| Tienda pública por finca | MISSING | PLANNED P1 |
| URL pública y QR | MISSING | PLANNED P1 |
| Solicitudes de compra sin registro | MISSING | PLANNED P1 |
| Comparación de interesados | MISSING | PLANNED P1 |
| WhatsApp wa.me prellenado | MISSING | PLANNED P1 |
| Notas de voz offline | MISSING | PLANNED P1 |
| Resumen hablado del día | MISSING | PLANNED P1 |
