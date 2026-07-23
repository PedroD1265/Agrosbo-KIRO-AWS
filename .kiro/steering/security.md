# AGROSBO - Seguridad

Responsabilidad: autenticación, autorización, acceso a archivos y datos
sensibles.

## Autenticación y autorización

- MUST autenticar con Amazon Cognito.
- MUST autorizar en API Gateway con JWT authorizer.
- MUST aplicar permisos por grupo: `capturista` y `trazador`.
- MUST exigir conexión para acciones sensibles (transformar, crear embarque,
  revisar, sellar, generar paquete, extraer documentos).
- MUST NOT permitir que un capturista ejecute operaciones de trazador.
- MUST NOT crear endpoints sin autenticación.

## Archivos

- MUST servir y recibir archivos solo mediante URLs prefirmadas de corta
  duración.
- MUST NOT exponer buckets ni objetos S3 de forma pública.

## Datos sensibles

- MUST tratar los datos de productores como PII y minimizar su exposición.
- MUST NOT registrar PII ni secretos en logs de CloudWatch.
- MUST NOT incluir en el paquete de evidencia más PII de la necesaria para la
  trazabilidad.

## Secretos

- MUST gestionar credenciales y configuración sensible fuera del código fuente.
- MUST NOT commitear secretos, claves ni credenciales al repositorio.
