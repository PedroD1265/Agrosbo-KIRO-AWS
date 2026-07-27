---
inclusion: always
---

# AGROSBO — Tecnología

Responsabilidad: stack y servicios, separando lo implementado de lo objetivo.

## CURRENT (verificado en código)

### Frontend

- React 18 + TypeScript + Vite 5.
- React Router 6, React Query 5, Tailwind + shadcn/radix, recharts.
- PWA con service worker y manifest.
- IndexedDB vía Dexie: cola de mutaciones y mapa temp→real.
- Comunicación con la API por rutas relativas `/api/*` (mismo origen en dev),
  `credentials: "include"`.
- `VITE_API_BASE_URL` configurable; `AuthTokenProvider` abstracción.

### Backend

- Express 5 como modular monolith (`api/src/routes.ts`).
- Adaptador Lambda: `api/src/handlers/index.ts` con `@vendia/serverless-express`
  (implementado en código; no verificado en AWS real; no desplegado).
- Validación con Zod; contratos en `shared/`.

### Datos

- PostgreSQL como fuente de verdad (Drizzle).
- `api/src/db.ts`: RDS Data API si `AWS_RDS_*`, node-postgres si `DATABASE_URL`.
  Data API existe en código pero no fue probado contra Aurora real.
- MemStorage parcial (subconjunto core de IStorage, solo dev).

### Autenticación

- Cookie de sesión firmada (HMAC); `AUTH_ENFORCEMENT` on/off; RBAC 5 roles.
- Provider pattern: `LocalSessionIdentityProvider` funcional; `CognitoJwt`
  PLACEHOLDER.

### Servicios

- Clima: Open-Meteo, sin API key, caché mem + DB.
- Alertas derivadas por reglas.
- Reportes CSV en servidor.
- Adjuntos en disco local; `LocalAttachmentStorage` funcional; S3 PLACEHOLDER.
- Mapa SVG/GeoJSON (sin proveedor de tiles).
- Idempotencia HTTP persistente (PostgreSQL + fallback mem).
- Health checks: `/health/live`, `/health/ready`.

## PLANNED P0 (aprobado, no implementado ni desplegado)

### Hosting y API

- S3 privado + CloudFront + OAC para frontend.
- API Gateway HTTP API como entrada de la API.
- Topología CloudFront /api/* vs URL separada: no decidida; se evalúa en Spec.
- Lambda como cómputo.
- CDK reproducible.
- Amplify Hosting: evaluado y descartado (ADR 016).

### Datos

- Aurora PostgreSQL Serverless v2 + RDS Data API.
- Migraciones reproducibles contra Aurora.

### Identidad

- Amazon Cognito User Pool + JWT authorizer.
- Proveedor local solo dev/tests.

### Agente operacional

- Endpoint REST; SSE opcional para progreso; WebSocket fuera de P0.
- Bedrock con tool calling.
- Herramientas estructuradas; no SQL libre.
- Borrador → confirmación → cola offline → idempotencia → auditoría.
- Auditoría con metadata mínima; no tokens raw ni payloads sensibles.
- Respuestas externas y eventos SES no requieren confirmación PWA.

### Voz

- Transcribe STT; Polly TTS; push-to-talk; streaming preferido.

### Colaboradores y notificaciones

- Token opaco; hash persistido; TTL; revocación; rate limiting.
- SES (puede iniciar en sandbox).
- Estados honestos: sent/delivered/opened_link/responded/completed.

### Inteligencia agrícola

- Evaluación visual preliminar: Bedrock multimodal.
- IrrigationDelayScenario: módulo determinista separado.
- LLM explica; no calcula.

### Adjuntos

- S3 privado + URLs prefirmadas.

### Seguridad

- Cognito JWT; Secrets Manager; CloudWatch; alarmas de costo.

## Deferred (NO usar sin una Spec)

- PostGIS.
- EventBridge / SQS / API Gateway WebSocket.
- RDS Proxy, DynamoDB, Step Functions, App Runner.
- WAF de pago (solo si riesgo y presupuesto lo justifican).
- Modelos provisionados de Bedrock.
- SageMaker.

## Reglas

- MUST separar rutas HTTP, orquestación por dominio y contratos compartidos.
- MUST NOT crear una Lambda por endpoint.
- MUST NOT declarar servicios diferidos como implementados.
- MUST NOT añadir servicios AWS solo por cantidad de logos.
- MUST NOT presentar Amplify como target activo.
- MUST NOT fijar CloudFront /api/* como decisión en Steering.
