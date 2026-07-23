# AGROSBO - Tecnología

Responsabilidad: stack y servicios aprobados. No repite reglas de dominio ni de
integridad.

## Frontend

- React + TypeScript + Vite.
- PWA con service worker.
- IndexedDB para cola de operaciones, cache de lectura y blobs pendientes.
- Publicación en AWS Amplify Hosting.

## Autenticación

- Amazon Cognito con grupos `capturista` y `trazador`.
- API Gateway HTTP API con JWT authorizer nativo de Cognito.

## Backend

- API Gateway HTTP API.
- Una Lambda principal en TypeScript organizada como modular monolith.
- MUST separar handlers HTTP, servicios de aplicación y reglas de dominio.
- MUST NOT crear una Lambda por endpoint.
- Una Lambda documental separada SOLO si la extracción lo requiere.

## Base de datos

- Aurora PostgreSQL Serverless v2.
- Acceso mediante RDS Data API.
- Transacciones mediante Data API.
- PostgreSQL es la única fuente de verdad.
- MUST NOT usar DynamoDB como base principal.
- MUST NOT usar RDS Proxy en el MVP.

## Archivos

- Amazon S3 con URLs prefirmadas.
- Fotografías, documentos y paquetes en S3; su metadata en PostgreSQL.

## Extracción documental

- Amazon Textract como proveedor inicial.
- Documentos de una sola página en el MVP.
- La persona selecciona una de las tres categorías; no hay clasificación
  automática en el MVP.
- MUST NOT usar Step Functions en el MVP.
- MUST NOT usar Bedrock para explicar bloqueadores.
- Azure Document Intelligence SOLO puede reemplazar a Textract si el spike
  comparativo demuestra ventaja clara.
- MUST NOT mantener dos pipelines documentales activos en producción.

## Observabilidad e infraestructura

- CloudWatch para logs y métricas.
- AWS CDK para infraestructura mínima reproducible.
- MUST NOT maximizar el número de servicios.

## Infraestructura de laboratorio (spikes)

- La primera Spec crea únicamente recursos mínimos de laboratorio necesarios
  para ejecutar los spikes.
- Recursos de lab: bucket S3, Aurora PostgreSQL Serverless v2 + Data API (solo
  si Spike B lo necesita), variables y secretos de laboratorio.
- MUST nombrar todos los recursos de lab con prefijo `agrosbo-dev-spike`.
- MUST incluir comandos de creación y destrucción documentados.
- MUST establecer límites de costo (alarma de CloudWatch si aplica).
- MUST NOT crear infraestructura de producción durante los spikes.

## Infraestructura de producción (Spec posterior)

- production-infrastructure-and-deployment cubre: ambientes, despliegue público,
  seguridad final, observabilidad, dominios, hardening y reproducibilidad.
- MUST NOT bloquear las Specs iniciales con dependencias tardías de infra.

## MUST NOT (arquitectura descartada)

- MUST NOT usar AWS App Runner.
- MUST NOT usar Step Functions.
- MUST NOT usar Amazon Bedrock en el MVP.
- MUST NOT usar Azure AI Search.
