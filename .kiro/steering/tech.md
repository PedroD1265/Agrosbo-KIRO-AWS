# AGROSBO - Tecnología

Responsabilidad: stack y servicios, separando lo implementado de lo objetivo y
lo diferido. No repite reglas de dominio ni de integridad.

## Implemented now (verificado en código)

### Frontend
- React 18 + TypeScript + Vite 5.
- React Router 6, React Query 5, Tailwind + shadcn/radix, recharts.
- PWA con service worker (`web/public/sw.js`) y manifest.
- IndexedDB vía Dexie: cola de mutaciones (`mutations`) y mapa temp→real
  (`idMap`).
- Comunicación con la API por **rutas relativas `/api/*`** (mismo origen),
  `credentials: "include"`.

### Backend
- Express 5 como **modular monolith** (`api/src/routes.ts` registra todas las
  rutas; módulos por dominio en `api/src/*.ts`).
- Adaptador Lambda presente: `api/src/handlers/index.ts` con
  `@vendia/serverless-express` (no desplegado).
- Validación con Zod; contratos compartidos en `shared/`.

### Datos
- PostgreSQL como fuente de verdad, acceso vía **Drizzle**.
- `api/src/db.ts` elige **RDS Data API** (`aws-data-api/pg`) si `AWS_RDS_*`, o
  **node-postgres** si `DATABASE_URL`.
- **Modo memoria parcial** (`MemStorage`, `USE_MEM_STORAGE=1`): cubre SOLO el
  subconjunto core del `IStorage` (blocks, greenhouses, campaigns, irrigation,
  tasks, observations, inventory + movements, harvest, settings, alerts). NO
  cubre adjuntos, gastos/mano de obra, aplicaciones, apicultura, usuarios ni
  caché de clima (esos requieren PostgreSQL).

### Autenticación
- **Cookie de sesión firmada (HMAC)** con `SESSION_SECRET`; `AUTH_ENFORCEMENT`
  on/off; RBAC de 5 roles (`admin`, `tecnico`, `encargado`, `operario`,
  `finanzas`). NO Cognito.

### Servicios y utilidades
- Clima: **Open-Meteo** (`api/src/weather.ts`), sin API key, con caché memoria +
  tabla `weatherCache`.
- Alertas derivadas por reglas (`api/src/alertsEngine.ts`).
- Reportes CSV en servidor (`api/src/reports.ts`, `api/src/csv.ts`).
- Adjuntos en **disco local** (`api/src/attachments.ts`, carpeta `uploads/`),
  metadata en PostgreSQL. Validación MIME (imágenes/PDF) y ≤ 10 MB.
- Mapa espacial propio en **SVG/GeoJSON** (`web/src/components/map`), sin
  proveedor de tiles.
- Idempotencia HTTP persistente (`api/src/idempotency.ts`, tabla
  `idempotency_keys`) con fallback en memoria.

## Hackathon target (planificado, NO desplegado)

### Frontend
- **AWS Amplify Hosting** (despliegues por rama; API URL configurable; no
  depende de cookies same-origin). CloudFront separado solo si se demuestra
  necesidad.
- `VITE_API_BASE_URL` configurable.
- Auth por **Bearer token** (Cognito JWT) en staging/producción.

### API
- **API Gateway HTTP API** + **AWS Lambda** ejecutando el Express vía adaptador
  serverless. Un solo Lambda (modular monolith), no una Lambda por endpoint.

### Datos
- **Aurora PostgreSQL Serverless v2** + **RDS Data API** (acceso preferido en
  Lambda para evitar pools de conexión). Drizzle. Migraciones reproducibles.

### Archivos
- **Amazon S3** + **URLs prefirmadas**; metadata en PostgreSQL. Requiere migrar
  los adjuntos de disco local a S3 antes del despliegue Lambda (ADR 007).

### Seguridad
- **Amazon Cognito** User Pool + JWT authorizer de API Gateway para
  staging/producción (ADR 010).
- Proveedor local de sesión únicamente para desarrollo/tests.
- Usuario interno vinculado por subject (`sub` de Cognito); roles/memberships en
  PostgreSQL.
- `SESSION_SECRET` en **Secrets Manager** para el proveedor local en despliegues
  intermedios.
- Protección CSRF donde aplique (mutaciones cross-origin).

### Operación
- **CloudWatch** (logs/métricas mínimas), **AWS CDK** (infra reproducible),
  ambientes reproducibles.

## Deferred (NO usar sin una Spec que lo justifique)

- **PostGIS** (no necesario para el MVP; JSONB/GeoJSON basta).
- **EventBridge / SQS / API Gateway WebSocket** (sin flujo que lo requiera aún).
- **RDS Proxy**, **DynamoDB** como base principal, **Step Functions**,
  **App Runner**, pagos, marketplace.

## Approved differentiators (requieren Spec propia, NO implementados)

- **Amazon Bedrock** con tool calling: copiloto conversacional de solo lectura
  con confirmación humana. Diferenciador aprobado para el hackathon (ADR futuro
  de Spec #13).
- **Amazon Textract**: candidato primario para extracción documental (ADR 013).
- **Azure AI Document Intelligence**: candidato comparativo para extracción
  documental (ADR 013); benchmark pendiente; AWS sigue como eje principal.

## Reglas

- MUST separar rutas HTTP, orquestación por dominio y contratos compartidos.
- MUST NOT crear una Lambda por endpoint.
- MUST NOT declarar servicios diferidos como implementados.
- MUST NOT añadir servicios AWS solo por aumentar cantidad de logos.
