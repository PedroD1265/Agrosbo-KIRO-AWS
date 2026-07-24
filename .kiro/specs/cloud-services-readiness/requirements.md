# Requirements - cloud-services-readiness

## Introducción

Esta Spec prepara AGROSBO para integrar servicios cloud administrados (Cognito,
S3, Aurora, Bedrock, Textract/Azure DI) sin crearlos. Establece fronteras de
proveedores, ciclo de vida de base de datos reproducible, idempotencia atómica,
inicialización fail-closed, health checks, configuración centralizada y CI con
PostgreSQL. Todos los flujos existentes deben seguir funcionando. Notación EARS.

## R1 - Preservación funcional
1. WHEN se ejecutan clean/format/lint/typecheck/test/build, THE SYSTEM SHALL
   pasar todos los gates sin regresiones.
2. THE SYSTEM SHALL preservar los 60 tests existentes sin modificar sus
   expectativas.
3. THE SYSTEM SHALL mantener funcionales: login local, cola offline, sync,
   RBAC, alertas, reportes CSV, adjuntos locales, clima.

## R2 - Proveedores intercambiables
1. THE SYSTEM SHALL definir interfaces TypeScript para: `IdentityProvider`,
   `AttachmentStorage`, `DocumentExtractionProvider`.
2. THE SYSTEM SHALL implementar un provider local funcional para cada interface
   (`LocalSessionIdentityProvider`, `LocalAttachmentStorage`,
   `NoOpDocumentExtraction`).
3. THE SYSTEM SHALL seleccionar el provider activo por variable de entorno.
4. THE SYSTEM SHALL NOT implementar providers remotos (Cognito, S3, Textract,
   Azure) en esta Spec.
5. THE SYSTEM SHALL NOT agregar providers stub que acepten llamadas sin efecto
   verificable.

## R3 - Producción estricta
1. WHEN `NODE_ENV=production`, THE SYSTEM SHALL rechazar el arranque si
   `APP_AUTH_PROVIDER=local-session`.
2. WHEN `NODE_ENV=production`, THE SYSTEM SHALL rechazar el arranque si
   `ATTACHMENTS_STORAGE_DRIVER=local`.
3. WHEN `NODE_ENV=production`, THE SYSTEM SHALL rechazar el arranque si no existe
   `DATABASE_URL` ni `AWS_RDS_*`.

## R4 - Migraciones reproducibles
1. THE SYSTEM SHALL definir `drizzle.config.ts` apuntando al schema compartido.
2. THE SYSTEM SHALL generar un snapshot/migración inicial que capture todo el
   schema actual.
3. THE SYSTEM SHALL proveer scripts: `npm run db:generate`, `npm run db:migrate`,
   `npm run db:check`.
4. WHEN se aplican migraciones a una base vacía, THE SYSTEM SHALL producir un
   schema funcional.
5. WHEN se aplican migraciones a una base ya migrada, THE SYSTEM SHALL no
   producir cambios destructivos.
6. THE SYSTEM SHALL NOT usar el schema del Spike A como migración de producción.

## R5 - Idempotencia atómica
1. THE SYSTEM SHALL realizar el claim antes de ejecutar cualquier efecto de
   negocio.
2. THE SYSTEM SHALL ejecutar el efecto de negocio y el registro del resultado
   idempotente dentro de una unidad transaccional.
3. THE SYSTEM SHALL garantizar máximo un efecto por idempotency key.
4. WHEN una confirmación se pierde (crash post-efecto), THE SYSTEM SHALL
   converger al mismo resultado en el reintento.
5. THE SYSTEM SHALL NOT eliminar registros `processing` indiscriminadamente al
   iniciar; MUST usar expiración explícita.
6. THE SYSTEM SHALL responder 409 cuando una key está en `processing` y MUST
   incluir `Retry-After`.
7. THE SYSTEM SHALL NOT serializar globalmente claves distintas.

## R6 - Inicialización fail-closed
1. WHEN la inicialización falla, THE SYSTEM SHALL fallar la invocación (no
   atender tráfico en estado parcial).
2. THE SYSTEM SHALL NOT marcar `initialized=true` después de un error.
3. THE SYSTEM SHALL registrar el error de forma estructurada sin secretos.

## R7 - Health / Live / Readiness
1. THE SYSTEM SHALL proveer `GET /health/live` que responda 200 si el proceso
   está activo (sin depender de DB).
2. THE SYSTEM SHALL proveer `GET /health/ready` que verifique: configuración
   válida, schema accesible, almacenamiento accesible, inicialización completa.
3. THE SYSTEM SHALL NOT combinar live y ready en un solo endpoint ambiguo.

## R8 - Configuración cloud
1. THE SYSTEM SHALL centralizar y validar la configuración de proveedores al
   arranque.
2. THE SYSTEM SHALL documentar todas las variables nuevas en `.env.example`.
3. THE SYSTEM SHALL NOT exigir servicios no implementados durante dev/test.
4. THE SYSTEM SHALL NOT versionar valores secretos reales.
5. THE SYSTEM SHALL NOT pasar secretos del backend al bundle web.

## R9 - CI PostgreSQL
1. THE SYSTEM SHALL añadir un job de integración con PostgreSQL (service
   container) al workflow de GitHub Actions.
2. EL job MUST ejecutar: migraciones, seed sintético, tests de integración
   (incluyendo idempotencia concurrente).
3. THE SYSTEM SHALL NOT requerir secretos AWS/Azure ni desplegar nada.

## R10 - Ninguna creación de recursos
1. THE SYSTEM SHALL NOT ejecutar cdk deploy, aws/az CLI de escritura, ni crear
   recursos cloud (Cognito, Aurora, S3, Lambda, Amplify, Secrets Manager,
   Bedrock, Azure DI).

## R11 - Trazabilidad Kiro
1. THE SYSTEM SHALL mantener ADRs 010-013 como decisiones de esta fase.
2. THE SYSTEM SHALL actualizar Steering y Spec map para reflejar el target.

## R12 - Preparación Cognito
1. THE SYSTEM SHALL definir un principal interno estable (subject,
   internalUserId, organizationId, farmIds, role, permissions,
   authenticationProvider).
2. THE SYSTEM SHALL abstraer la API de dependencias directas de la cookie.
3. THE SYSTEM SHALL NOT agregar un provider Cognito que acepte tokens sin
   validación.

## R13 - Preparación S3
1. THE SYSTEM SHALL definir `AttachmentStorage` con operaciones: prepareUpload,
   confirmUpload, getDownloadAccess, deleteObject, verifyObject.
2. THE SYSTEM SHALL mantener `LocalAttachmentStorage` funcional.
3. THE SYSTEM SHALL NOT implementar S3AttachmentStorage todavía.

## R14 - Preparación Textract / Azure
1. THE SYSTEM SHALL definir `DocumentExtractionProvider` con resultado canónico
   (provider, documentType, fields, lineItems, confidence, rawReference,
   warnings).
2. THE SYSTEM SHALL implementar `NoOpDocumentExtraction` que retorne vacío.
3. THE SYSTEM SHALL NOT implementar TextractProvider ni AzureProvider.

## R15 - Pruebas
1. THE SYSTEM SHALL añadir tests de idempotencia concurrente (2 y 10 solicitudes
   simultáneas, fallo post-claim, confirmación perdida, retry de 409, claves
   independientes).
2. THE SYSTEM SHALL probar que memoria y PostgreSQL tienen semántica compatible
   para idempotencia.
3. THE SYSTEM SHALL NOT debilitar los tests del Spike A.
