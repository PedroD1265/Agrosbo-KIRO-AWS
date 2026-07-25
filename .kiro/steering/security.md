# AGROSBO - Seguridad

Responsabilidad: autenticación, autorización, secretos, archivos y datos
sensibles. Refleja la implementación real y los requisitos de producción.
Reemplaza el modelo previo basado en Cognito (ver ADR 008); Cognito queda
diferido.

## Autenticación actual (Implemented now)

- **Cookie de sesión firmada (HMAC-SHA256)**: `userId.expiresAt.firma`,
  `HttpOnly`, `SameSite=Lax`, `Max-Age` 7 días, `Secure` en producción
  (`api/src/auth.ts`).
- Contraseñas con **scrypt** + salt y comparación en tiempo constante
  (`api/src/users.ts`).
- `SESSION_SECRET` fuera del código; en dev con `AUTH_ENFORCEMENT=off` se usa un
  secreto efímero (sesiones mueren al reiniciar).
- Revocación de sesión: blocklist en memoria + tabla `revoked_sessions`.
- `AUTH_ENFORCEMENT=off` (default de dev) inyecta un usuario admin sintético y
  **abre el acceso**: apto solo para desarrollo.

## RBAC

- Roles: `admin`, `tecnico`, `encargado`, `operario`, `finanzas`.
- Guards `requireRole` en escrituras sensibles (inventario, cosecha,
  aplicaciones, gastos/mano de obra, usuarios). Matriz en
  `web/src/lib/permissions.ts`.

## Arquitectura de identidad objetivo (staging/producción)

- **Amazon Cognito User Pool** para staging y producción (ADR 010).
- **JWT authorizer** de API Gateway HTTP API.
- Usuario interno vinculado por `sub` (subject) de Cognito; roles y membresías
  en PostgreSQL.
- Proveedor local de sesión (`LocalSessionIdentityProvider`) únicamente para
  desarrollo y tests.
- `APP_AUTH_PROVIDER=local-session|cognito-jwt` determina el proveedor activo.
- En producción, `cognito-jwt` es obligatorio; `local-session` está prohibido.

## Secretos

- MUST gestionar credenciales y configuración sensible fuera del código.
- MUST NOT commitear secretos: `.env`, `.env.*` (salvo `*.example`), `*.pem`,
  `*.key` están en `.gitignore`; hook `secret-scan` bloquea commits con secretos
  staged.
- MUST NOT registrar secretos ni PII en logs (el logger omite query strings y
  hashea la idempotency key).

## Archivos

- Estado actual: adjuntos en disco local bajo `uploads/`, servidos con
  `X-Content-Type-Options: nosniff`, con guard anti path-traversal y validación
  MIME/tamaño.
- Estado objetivo: **S3 + URLs prefirmadas**; no exponer buckets públicos;
  aislar archivos por organización cuando exista tenancy.

## PII y datos financieros

- MUST tratar nombres, correos y datos financieros como sensibles y minimizar su
  exposición en respuestas y logs.

## Aislamiento futuro por organización (tenancy)

- Toda consulta MUST limitarse por membresía de organización/granja; los IDs en
  la URL NO conceden acceso. Ver `docs/architecture/multi-tenancy-plan.md`.

## Seguridad del asistente (futuro)

- Solo lectura en la primera versión; sin SQL libre; sin acceso entre
  organizaciones; sin acciones sin confirmación humana; registrar tool calls;
  RBAC obligatorio. Ver `docs/architecture/farm-assistant-plan.md`.

## Seguridad del marketplace (futuro)

- Separar propietario y contraparte; autorizar por membresía; no exponer datos
  internos de una organización a otra.
