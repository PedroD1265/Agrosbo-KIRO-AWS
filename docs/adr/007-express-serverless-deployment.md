# ADR 007 - Despliegue serverless del Express modular monolith

Estado: Accepted

Fecha: 2026-07-24

## Contexto

El backend es un **Express 5 modular monolith** (`api/src`). El objetivo de
infraestructura es AWS serverless. El código ya incluye un adaptador Lambda
(`api/src/handlers/index.ts` con `@vendia/serverless-express`) y una ruta de
acceso a datos por **RDS Data API** (`api/src/db.ts`). No se reescribirá el
backend a Lambdas por endpoint.

## Decisión

- **Conservar Express** como modular monolith.
- **Objetivo principal**: ejecutar Express en **AWS Lambda** detrás de **API
  Gateway HTTP API**, mediante el adaptador serverless ya presente.
- Acceso a datos por **RDS Data API** en Lambda (evita pools de conexión
  persistentes).
- **Fallback**: **ECS Fargate + ALB** ejecutando el mismo contenedor Express sin
  cambios, si las condiciones de Lambda no se cumplen a tiempo. Es un fallback,
  NO una arquitectura paralela.

## Condiciones necesarias antes del despliegue Lambda

1. **Adjuntos a S3**: `api/src/attachments.ts` escribe en disco local
   (`uploads/`), incompatible con el FS efímero/solo-lectura de Lambda. Debe
   migrarse a **S3 con URLs prefirmadas** (Spec de attachments/object storage).
2. **Import dinámico de Vite**: `api/src/index.ts` importa `./vite.ts` (que
   importa `vite` y el plugin React) en el árbol del módulo. Debe aislarse con
   import dinámico para no empaquetar Vite en el bundle Lambda ni penalizar el
   cold start.
3. **Data API**: preferir la ruta `AWS_RDS_*` sobre `DATABASE_URL` en Lambda.
4. **Origen único**: servir frontend y API bajo el mismo dominio (CloudFront)
   por las cookies y las URLs relativas del cliente.

## Alternativas

- Lambda por endpoint: descartada (rompe el monolito modular, multiplica
  complejidad).
- Fargate como arquitectura principal: viable y con cero cambios de código, pero
  mayor costo en reposo y menos alineado con "serverless"; se mantiene como
  fallback.
- Lambda Function URL sin API Gateway: menos piezas pero pierde authorizers y
  narrativa; no recomendada frente a API Gateway.

## Consecuencias

- La migración de adjuntos a S3 es un prerrequisito de la ruta Lambda y se
  planifica como Spec propia.
- Mientras tanto, el desarrollo local y el fallback Fargate funcionan con disco
  local sin cambios.
- El adaptador Lambda ya existente reduce el riesgo de la ruta principal.
