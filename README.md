# AGROSBO

> **English summary (short).** AGROSBO is an **offline-first web platform to manage farm operations**: farms, blocks, greenhouses, campaigns, tasks, observations, agrochemical applications, inventory, irrigation, weather, alerts, harvest, basic costs and operational reports — usable in the field with poor connectivity. It is a **Progressive Web App** (React + Vite) backed by an **Express modular monolith** (TypeScript) over **PostgreSQL** (Drizzle), with an **IndexedDB offline queue** and **optimistic sync**. The hackathon target is an **AWS serverless** deployment (S3 + CloudFront + OAC + API Gateway + Lambda + Aurora Serverless v2 + Data API + S3 attachments + Bedrock + Transcribe + Polly + SES). Auth currently uses a signed session cookie (local dev/test only); **Cognito is PLANNED P0** for staging/production. The **Asistente AGROSBO** (operational farm agent with structured tools, voice, visual assessment and deterministic scenarios) is **PLANNED P0**, not yet implemented. No AWS resources are currently deployed. This document is written primarily in Spanish; details live under [`/docs`](docs/).

---

AGROSBO es una plataforma web **offline-first** para gestionar operaciones agrícolas: centraliza la información de la granja, coordina el trabajo de campo y convierte registros dispersos en acciones, historial y evidencia operativa.

> **Aviso de estado.** AGROSBO evolucionó desde un prototipo previo de trazabilidad de café hacia una **plataforma de gestión agrícola integral**. Este README describe el producto **real actual**, no el anterior. La documentación distingue explícitamente entre lo implementado, lo que está en estabilización y lo que es visión futura.

## 1. Problema

Muchas granjas operan con datos dispersos (cuadernos, mensajes, hojas de cálculo) y con conectividad intermitente en campo. Falta un lugar único que registre lo que ocurre, lo convierta en acciones concretas y conserve historial y evidencia operativa, incluso sin conexión.

## 2. Propuesta de valor

- Registro operativo conectado: bloques/invernaderos, campañas, tareas, observaciones, aplicaciones, inventario, riego, cosecha y costos básicos.
- **Offline-first real**: se captura sin conexión y se sincroniza sin duplicar al recuperar red.
- Datos que generan **acciones** (alertas accionables), no solo tableros pasivos.
- Base preparada para un **agente operacional multimodal** (Asistente AGROSBO) con herramientas, voz, visión y escenarios — dirección P0 aprobada, no implementada. Detalle en [`docs/product/product-scope-v2.md`](docs/product/product-scope-v2.md).

## 3. Estado de capacidades

Cada capacidad se etiqueta con precisión. No se declara implementado algo que solo tiene nombre, pantalla o tipo.

### Implemented now (verificado en código)
- PWA instalable (service worker + manifest), estado de conexión, cola offline en IndexedDB (Dexie), sincronización con reintentos, actualizaciones optimistas, reconciliación de IDs temporales, idempotencia por clave de cliente.
- Dominios operativos: Today, Mapa, Bloques, Invernaderos, Campañas, Aplicaciones, Riego (+ asesor), Apicultura, Tareas, Observaciones, Inventario (+ movimientos), Cosecha, Gastos + Mano de obra, Reportes CSV, Integraciones (registro), Configuración, Usuarios/Login.
- Backend Express modular; almacenamiento en PostgreSQL vía Drizzle; **modo memoria parcial** para desarrollo.
- Autenticación por **cookie de sesión firmada (HMAC)** + RBAC de 5 roles.
- Clima vía **Open-Meteo**; motor de **alertas** derivadas; **reportes CSV** en servidor.
- Adjuntos con validación (imágenes/PDF ≤ 10 MB) almacenados en **disco local** con metadata en PostgreSQL.
- Mapa espacial propio en **SVG/GeoJSON** (sin proveedor de tiles externo).

### Completado recientemente (PR #2 — cloud-services-readiness)
- Preparación de la plataforma para servicios cloud administrados: provider boundaries, migraciones reproducibles, idempotencia atómica, health checks, CI con PostgreSQL.
- Adaptación del cliente API: base URL configurable, AuthTokenProvider abstraction.
- 165 pruebas aprobadas (132 unitarias + 7 MemStorage + 26 integración PostgreSQL).

### Hackathon target (PLANNED P0, no desplegado)
- Despliegue **AWS serverless**: S3 privado + CloudFront + OAC, API Gateway HTTP API, Lambda (Express serverless), Aurora PostgreSQL Serverless v2 + RDS Data API, S3 para adjuntos con URLs prefirmadas, Secrets Manager, CloudWatch, CDK.
- **Amazon Cognito** (User Pool + JWT authorizer) para staging/producción.
- **Asistente AGROSBO** (agente operacional multimodal): Bedrock con tool calling, Transcribe STT, Polly TTS, herramientas estructuradas, confirmación antes de mutaciones.
- **Colaboradores externos** sin cuenta, con enlace seguro (token opaco, hash, TTL).
- **Amazon SES** para notificaciones y enlaces.
- **Evaluación visual preliminar** de fotografías agrícolas (Bedrock multimodal).
- **IrrigationDelayScenario** (motor determinista de escenarios).
- Detalle completo en [`docs/product/product-scope-v2.md`](docs/product/product-scope-v2.md).

### Planned next (P1, posterior a P0 estable)
- Tienda pública de una sola finca (URL, QR, solicitudes sin registro).
- Comparación explicada de interesados.
- WhatsApp vía wa.me prellenado (envío humano).
- Notas de voz capturadas offline.
- Resumen hablado del día.

### Long-term vision (P2, no implementado)
- Marketplace multi-organización, múltiples proveedores, mensajería en tiempo real, notificaciones push, pagos, reputación, logística, automatización avanzada por IA, multi-tenancy completo, WhatsApp Cloud API.

### Deferred / Not implemented
- Multi-tenancy real, PostGIS, EventBridge/SQS/WebSocket, pagos, marketplace. Ninguno está implementado hoy.
- **Amplify Hosting**: evaluado y descartado como target activo (ADR 016).
- **Azure AI Document Intelligence**: candidato comparativo para extracción documental (benchmark pendiente contra Textract; ver ADR 013).

## 4. Golden path de la demo

### A. CURRENT (verificable hoy)

1. Login. 2. Today: tareas, alertas, clima. 3. Revisar bloques/inventario/campañas. 4. **Pierde conexión.** 5. Registra observación/tarea/cosecha offline. 6. Mutación en IndexedDB. 7. UI muestra estado pendiente. 8. **Recupera conexión.** 9. Sincroniza sin duplicar (X-Idempotency-Key). 10. IDs reconciliados. 11. Impacto visible en Today/inventario/reportes. 12. Exporta reporte CSV.

### B. PLANNED P0 (aprobado, no implementado)

13. Consulta al Asistente AGROSBO (texto/voz). 14. Agente lee datos vía herramientas. 15. Navega visiblemente. 16. Prepara borrador. 17. Usuario confirma → cola offline → idempotencia. 18. SES acepta solicitud y devuelve message ID → sent (no implica entrega). 19. Colaborador accede mediante token válido → opened_link (puede ser escáner; no prueba lectura). 20. Colaborador acepta, rechaza o aclara → responded. 21. Foto agrícola → evaluación visual preliminar (Bedrock). 22. IrrigationDelayScenario → LLM explica.

Detalle en [`docs/product/golden-paths-p0-p1.md`](docs/product/golden-paths-p0-p1.md).

## 5. Capturas / demo

> _Placeholders — se añadirán al preparar la demo._ Ver el guión en [`docs/product/hackathon-demo-story.md`](docs/product/hackathon-demo-story.md).

## 6. Arquitectura actual (as-is)

- **Frontend**: React 18 + Vite 5 + TypeScript, React Router 6, React Query 5, Tailwind + shadcn/radix, Dexie (IndexedDB), PWA (service worker + manifest). Consume la API por rutas relativas `/api/*` (mismo origen).
- **Backend**: Express 5 como modular monolith (`api/src/routes.ts`), con adaptador Lambda ya presente (`api/src/handlers/index.ts`, `@vendia/serverless-express`).
- **Datos**: PostgreSQL vía Drizzle. `db.ts` selecciona **RDS Data API** si `AWS_RDS_*`, o **node-postgres** si `DATABASE_URL`. `MemStorage` cubre solo el subconjunto core del `IStorage` (dev).
- **Auth**: cookie firmada HMAC + RBAC; `AUTH_ENFORCEMENT` on/off.
- **Infra**: `infra/` es **placeholder** (sin CDK real todavía).

```mermaid
flowchart LR
  B[Navegador / PWA] -->|/ estático| EX[Express 5]
  B -->|/api/* fetch cookie| EX
  B -->|/uploads/* estático| EX
  EX --> AUTH[cookie HMAC + RBAC]
  AUTH --> RT[routes.ts]
  RT --> ST[IStorage: Mem o DbStorage]
  ST --> PG[(PostgreSQL local)]
  RT --> WX[weather.ts] --> OM[Open-Meteo]
  RT --> FS[(uploads/ disco local)]
```

> Nota: el camino RDS Data API existe en código pero no fue validado contra
> Aurora real ni desplegado.

## 7. Arquitectura AWS objetivo (hackathon)

```mermaid
flowchart LR
  U[Navegador PWA] --> CF[CloudFront + OAC]
  CF -->|/ , assets| S3W[(S3 privado frontend)]
  U -->|API calls| AGW[API Gateway HTTP API]
  U -->|login| COG[Cognito]
  COG -->|JWT authorizer| AGW
  AGW --> L[Lambda: Express serverless-express]
  L -->|Data API| AUR[(Aurora PostgreSQL Serverless v2)]
  L -->|presigned| S3U[(S3 privado adjuntos)]
  L --> BK[Bedrock / Transcribe / Polly]
  L --> SES[Amazon SES]
  L --> OM[Open-Meteo]
  L --> CW[CloudWatch]
  SM[Secrets Manager] --> L
```

> Nota: la topología exacta (CloudFront como proxy de /api/* vs URL separada) se
> decidirá en la Spec de infraestructura. Amplify Hosting fue evaluado y
> descartado (ADR 016). Detalle del agente en
> [`docs/architecture/operational-agent-plan.md`](docs/architecture/operational-agent-plan.md).

Detalle en [`docs/architecture/current-and-target.md`](docs/architecture/current-and-target.md) y [`docs/architecture/aws-service-plan.md`](docs/architecture/aws-service-plan.md).

## 8. Capacidades offline-first

- Cola durable de mutaciones en IndexedDB (Dexie), con estado `pending/syncing/failed`.
- Orden y reconciliación temp→real (`idMap`), idempotencia con `X-Idempotency-Key`, backoff exponencial (hasta 6 intentos), aislamiento de errores 4xx vs 5xx.
- Detalle y límites en [`.kiro/steering/offline-first.md`](.kiro/steering/offline-first.md). No todos los módulos funcionan offline (ver ese documento).

## 9. Stack tecnológico

| Capa | Tecnologías |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, React Router 6, React Query 5, Tailwind, shadcn/radix, Dexie |
| Backend | Express 5, Drizzle ORM, Zod, PostgreSQL / RDS Data API |
| Compartido | `shared/` (contratos Zod + Drizzle + GeoJSON) |
| Calidad | ESLint, Prettier, Vitest, tsc |
| Objetivo AWS | S3, CloudFront, API Gateway, Lambda, Aurora Serverless v2, Data API, Secrets Manager, CloudWatch, CDK |

## 10. Estructura del repositorio

```
web/      PWA React (UI, cola offline, cliente API)
api/      Express modular monolith (rutas + módulos por dominio)
shared/   Contratos Zod + Drizzle + GeoJSON (usados por web y api)
infra/    AWS CDK (placeholder por ahora)
docs/     ADRs, arquitectura, producto, Kiro, hackathon
spikes/   Código desechable de spikes (Spike A validado)
.kiro/    steering/, specs/, hooks/
```

## 11. Instalación local

```bash
npm install          # instala workspaces (web, api, infra, shared, spikes/*)
```

Requisitos: Node ≥ 20.

## 12. Variables de entorno

Copiar `.env.example` a `.env.local` y completar. Variables reales usadas por el código: `NODE_ENV`, `PORT`, `DATABASE_URL`, `USE_MEM_STORAGE`, `AUTH_ENFORCEMENT`, `SESSION_SECRET`, `SEED_ADMIN_PASSWORD`, `AWS_RDS_SECRET_ARN`, `AWS_RDS_RESOURCE_ARN`, `AWS_RDS_DATABASE`, `AWS_REGION`. Ver `.env.example` para descripciones y valores sintéticos.

## 13. Ejecución con memoria (dev rápido)

```bash
# Almacenamiento en memoria (subconjunto core; sin adjuntos/finanzas/apicultura/usuarios)
USE_MEM_STORAGE=1 npm run dev
```
Modo abierto por defecto (`AUTH_ENFORCEMENT=off`) con usuario admin sintético. Ver límites del modo memoria en [`.kiro/steering/tech.md`](.kiro/steering/tech.md).

## 14. Ejecución con PostgreSQL

```bash
# Con una base PostgreSQL disponible
DATABASE_URL=postgres://user:pass@host:5432/agrosbo npm run dev
```
Al arrancar se ejecuta un seed idempotente y se crea un usuario admin inicial (contraseña por `SEED_ADMIN_PASSWORD` o generada y mostrada una vez en logs).

## 15. Tests y quality gates

```bash
npm run format      # prettier --check .
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # build de todos los workspaces
```

## 16. Uso de Kiro

AGROSBO se construye con Kiro como eje del proceso de ingeniería: Steering, Specs (Requirements EARS + Design + Tasks), Hooks deterministas, checkpoints, auditoría arquitectónica y revisión incremental. Detalle en [`docs/kiro/development-process.md`](docs/kiro/development-process.md).

## 17. Uso de AWS

AWS es el eje de infraestructura objetivo. Cada servicio se justifica por una necesidad real del código; no se añaden servicios solo por cantidad. Ver plan por servicio en [`docs/architecture/aws-service-plan.md`](docs/architecture/aws-service-plan.md).

## 18. Alcance del hackathon

Core terminable primero; diferenciadores solo tras estabilizar el core. Ver [`.kiro/steering/hackathon-scope.md`](.kiro/steering/hackathon-scope.md) y [`docs/hackathon/judging-strategy.md`](docs/hackathon/judging-strategy.md).

## 19. Roadmap

Core operativo → infraestructura AWS serverless → agente operacional → colaboradores y notificaciones → inteligencia agrícola → calidad, seguridad y demo P0 → tienda pública P1 → visión futura P2 (marketplace, mensajería, pagos). Ver [`docs/roadmap/delivery-roadmap-v2.md`](docs/roadmap/delivery-roadmap-v2.md) y [`docs/spec-map.md`](docs/spec-map.md).

## 20. Seguridad

Auth CURRENT: cookie firmada HMAC (solo local dev/test), `SESSION_SECRET` fuera del código, RBAC por rol, adjuntos validados. Auth PLANNED P0: Cognito JWT para staging/producción; proveedor local solo dev/tests; no se exige mismo origen. Requisitos de producción y plan en [`.kiro/steering/security.md`](.kiro/steering/security.md).

## 21. Limitaciones conocidas

- Rutas espaciales agregadas (`GET /api/spatial/features`) y de edición de geometría **no existen aún**: el mapa se muestra sin polígonos agregados (ver [`docs/architecture/spatial-gap-register.md`](docs/architecture/spatial-gap-register.md)).
- El **modo memoria** solo cubre el core del `IStorage`; adjuntos, finanzas, apicultura, aplicaciones y usuarios requieren PostgreSQL.
- Los **adjuntos en disco** local no son compatibles con Lambda: requieren migración a S3 antes del despliegue serverless.
- Infraestructura AWS **no desplegada** (CDK pendiente).

## 22. Disclaimer

AGROSBO **no es** un ERP genérico terminado, ni una certificadora, ni un sistema oficial gubernamental, ni una fuente infalible de asesoría agronómica, ni una plataforma financiera o de pagos, ni un marketplace implementado, ni un chatbot omnisciente. Es una herramienta operativa en desarrollo; las capacidades futuras están marcadas como tales.

## 23. Estado actual

Baseline funcional integrada en `main` (PR #1 y #2 merged). CI verde (GitHub Actions). 165 pruebas aprobadas (132 unitarias + 7 MemStorage + 26 integración PostgreSQL). Quality gates reproducibles (`npm ci` + clean/format/lint/typecheck/test/build). Preparación cloud completada (provider boundaries, migraciones, idempotencia atómica, health checks — PR #2). Infraestructura AWS no desplegada. Dirección P0 aprobada: agente operacional multimodal con herramientas controladas, voz, colaboradores externos, evaluación visual preliminar y motor de escenarios determinista; ver [`docs/product/product-scope-v2.md`](docs/product/product-scope-v2.md). Estado detallado en [`docs/product/capability-status-matrix.md`](docs/product/capability-status-matrix.md). Roadmap en [`docs/roadmap/delivery-roadmap-v2.md`](docs/roadmap/delivery-roadmap-v2.md).
