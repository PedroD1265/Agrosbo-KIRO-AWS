# AGROSBO

> **English summary (short).** AGROSBO is an **offline-first web platform to manage farm operations**: farms, blocks, greenhouses, campaigns, tasks, observations, agrochemical applications, inventory, irrigation, weather, alerts, harvest, basic costs and operational reports — usable in the field with poor connectivity. It is a **Progressive Web App** (React + Vite) backed by an **Express modular monolith** (TypeScript) over **PostgreSQL** (Drizzle), with an **IndexedDB offline queue** and **optimistic sync**. The hackathon target is an **AWS serverless** deployment (S3 + CloudFront + API Gateway + Lambda + Aurora Serverless v2 + Data API + S3 attachments). Auth uses a signed session cookie for the demo; **Cognito is deferred**. This document is written primarily in Spanish; details live under [`/docs`](docs/).

---

AGROSBO es una plataforma web **offline-first** para gestionar operaciones agrícolas: centraliza la información de la granja, coordina el trabajo de campo y convierte registros dispersos en acciones, historial y evidencia operativa.

> **Aviso de estado.** AGROSBO evolucionó desde un prototipo previo de trazabilidad de café hacia una **plataforma de gestión agrícola integral**. Este README describe el producto **real actual**, no el anterior. La documentación distingue explícitamente entre lo implementado, lo que está en estabilización y lo que es visión futura.

## 1. Problema

Muchas granjas operan con datos dispersos (cuadernos, mensajes, hojas de cálculo) y con conectividad intermitente en campo. Falta un lugar único que registre lo que ocurre, lo convierta en acciones concretas y conserve historial y evidencia operativa, incluso sin conexión.

## 2. Propuesta de valor

- Registro operativo conectado: bloques/invernaderos, campañas, tareas, observaciones, aplicaciones, inventario, riego, cosecha y costos básicos.
- **Offline-first real**: se captura sin conexión y se sincroniza sin duplicar al recuperar red.
- Datos que generan **acciones** (alertas accionables), no solo tableros pasivos.
- Base preparada para crecer hacia comercio agrícola y un copiloto de datos (visión futura, no implementada).

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

### Being stabilized (esta fase)
- Preparación de la plataforma para servicios cloud administrados (provider boundaries, migraciones reproducibles, idempotencia atómica, health checks).
- Adaptación del cliente API para base URL configurable y auth por token.

### Hackathon target (planificado, no desplegado)
- Despliegue **AWS serverless**: S3 + CloudFront + API Gateway HTTP API + Lambda (Express vía adaptador serverless) + Aurora PostgreSQL Serverless v2 + RDS Data API + S3 para adjuntos con URLs prefirmadas + Secrets Manager + CloudWatch + CDK.
- **Amazon Cognito** (User Pool + JWT authorizer) para staging/producción.
- **Amplify Hosting** para el frontend PWA (despliegues por rama, API URL configurable).
- **Bedrock** con tool calling como diferenciador aprobado (copiloto de datos, solo lectura).

### Planned next (diferenciadores, solo tras estabilizar el core)
- Consulta conversacional de datos de la granja mediante herramientas controladas (solo lectura).
- Primer flujo estructurado de solicitud de servicio agrícola + orden de trabajo, con impacto visible en Today.

### Long-term vision (no implementado)
- Marketplace de productos, proveedores/maquinaria, mensajería en tiempo real, notificaciones externas, pagos, reputación, logística, automatización avanzada por IA.

### Deferred / Not implemented
- Multi-tenancy real, PostGIS, EventBridge/SQS/WebSocket, pagos, marketplace, mensajería. Ninguno está implementado hoy.
- **Azure AI Document Intelligence**: candidato comparativo para extracción documental (benchmark pendiente contra Textract; ver ADR 013).

## 4. Golden path de la demo

1. El propietario inicia sesión. 2. Abre **Today**. 3. Revisa granja, bloques, tareas, inventario, clima y alertas. 4. Abre una campaña o parcela. 5. **Pierde conexión.** 6. Registra una observación / tarea / aplicación / cosecha offline. 7. La mutación se guarda en **IndexedDB**. 8. La UI muestra el estado pendiente. 9. **Recupera conexión.** 10. La app sincroniza **sin duplicar**. 11. Se actualizan datos relacionados. 12. Revisa el impacto en Today, campaña, inventario y reportes. 13. Exporta un **reporte CSV**.

Flujo diferenciador **futuro (roadmap, aún no implementado)**: 14. Pregunta al asistente qué requiere atención → 15. consulta herramientas autorizadas → 16. devuelve datos reales → 17. genera una solicitud de trabajo → 18. un proveedor cotiza → 19. se acepta y se crea una orden.

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
  ST --> PG[(PostgreSQL / Aurora Data API)]
  RT --> WX[weather.ts] --> OM[Open-Meteo]
  RT --> FS[(uploads/ disco local)]
```

## 7. Arquitectura AWS objetivo (hackathon)

```mermaid
flowchart LR
  U[Navegador PWA] --> CF[CloudFront - origen único]
  CF -->|/ , assets| S3W[(S3 estático)]
  CF -->|/uploads/*| S3U[(S3 adjuntos)]
  CF -->|/api/*| AGW[API Gateway HTTP API]
  AGW --> L[Lambda: Express serverless-express]
  L -->|Data API| AUR[(Aurora PostgreSQL Serverless v2)]
  L -->|presigned| S3U
  L --> OM[Open-Meteo]
  L --> CW[CloudWatch]
  SM[Secrets Manager] --> L
```

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

Core operativo → infraestructura AWS serverless → diferenciadores (asistente de datos, primer flujo de servicio) → visión futura (marketplace, mensajería, pagos). Ver [`docs/spec-map.md`](docs/spec-map.md).

## 20. Seguridad

Auth por cookie firmada para la demo (mismo origen), `SESSION_SECRET` fuera del código, RBAC por rol, adjuntos validados. Requisitos de producción y plan (CSRF, Secrets Manager, aislamiento por organización) en [`.kiro/steering/security.md`](.kiro/steering/security.md).

## 21. Limitaciones conocidas

- Rutas espaciales agregadas (`GET /api/spatial/features`) y de edición de geometría **no existen aún**: el mapa se muestra sin polígonos agregados (ver [`docs/architecture/spatial-gap-register.md`](docs/architecture/spatial-gap-register.md)).
- El **modo memoria** solo cubre el core del `IStorage`; adjuntos, finanzas, apicultura, aplicaciones y usuarios requieren PostgreSQL.
- Los **adjuntos en disco** local no son compatibles con Lambda: requieren migración a S3 antes del despliegue serverless.
- Infraestructura AWS **no desplegada** (CDK pendiente).

## 22. Disclaimer

AGROSBO **no es** un ERP genérico terminado, ni una certificadora, ni un sistema oficial gubernamental, ni una fuente infalible de asesoría agronómica, ni una plataforma financiera o de pagos, ni un marketplace implementado, ni un chatbot omnisciente. Es una herramienta operativa en desarrollo; las capacidades futuras están marcadas como tales.

## 23. Estado actual

Baseline funcional integrada en `main` (PR #1 merged). CI verde (GitHub Actions). 60/60 tests. Quality gates reproducibles (`npm ci` + clean/format/lint/typecheck/test/build). Fase actual: preparación de plataforma para servicios cloud (provider boundaries, migraciones, idempotencia, health checks). Hackathon target definido; infraestructura no desplegada.
