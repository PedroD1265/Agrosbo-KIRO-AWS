# ADR 010 - Identidad gestionada con Amazon Cognito

Estado: Accepted

Fecha: 2026-07-24

## Contexto

La aplicación usa una cookie HMAC firmada (`api/src/auth.ts`) como autenticación
provisional. Para staging y producción se necesita un proveedor de identidad
gestionado que soporte JWT, token refresh, MFA futuro y federación, sin requerir
que el frontend y la API compartan origen.

## Decisión

- **Amazon Cognito User Pool** para staging y producción.
- **JWT authorizer** de API Gateway HTTP API valida el token antes de que
  llegue a la Lambda.
- **Usuario interno** en PostgreSQL vinculado por `sub` (subject claim de
  Cognito). El `sub` es estable e inmutable.
- **Roles, organizaciones, granjas y membresías** viven en PostgreSQL, no en
  claims de Cognito (simplicidad; Cognito solo identifica).
- **Proveedor local** (`LocalSessionIdentityProvider`) conserva la cookie HMAC
  actual y se usa **únicamente** para desarrollo y tests. No es aceptable en
  producción.
- Variable `APP_AUTH_PROVIDER=local-session|cognito-jwt` determina el proveedor
  activo.

## Principal interno estable

Independientemente del proveedor, la API opera sobre un principal con:
- `subject` (string; `sub` de Cognito o ID local)
- `internalUserId` (VARCHAR; ID en tabla `users`)
- `organizationId` (VARCHAR)
- `farmIds` (string[])
- `role` (enum)
- `permissions` (set)
- `authenticationProvider` ("local-session" | "cognito-jwt")

## Alternativas

- Cognito groups para RBAC: descartada; grupos no cubren membresías por
  granja y aumentan acoplamiento con el IdP.
- Auth0/Clerk: descartados; preferimos stack AWS integrado.
- Mantener cookie para producción: descartada; no funciona cross-origin
  (Amplify Hosting separa frontend y API).

## Consecuencias

- Frontend usa `Authorization: Bearer <token>` en staging/prod.
- El proveedor local sigue usando `credentials: "include"` + cookie.
- API Gateway rechaza tokens inválidos/expirados antes de invocar la Lambda.
- La Lambda resuelve el `sub` a un usuario interno + membresías en cada request
  (cacheable por instancia si es necesario).
- Cognito User Pool se crea en la Spec de infraestructura (#9), no en esta fase.
