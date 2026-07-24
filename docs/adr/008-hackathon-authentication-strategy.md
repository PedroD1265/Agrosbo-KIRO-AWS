# ADR 008 - Estrategia de autenticación para el hackathon

Estado: Accepted

Fecha: 2026-07-24

## Contexto

El plan original (ADR de seguridad previo / Steering) asumía **Amazon Cognito**
con JWT authorizer en API Gateway. El código actual implementa autenticación por
**cookie de sesión firmada (HMAC)** con RBAC de 5 roles (`api/src/auth.ts`,
`api/src/users.ts`, `web/src/lib/permissions.ts`), funcional y probada.

## Decisión

- **Usar la cookie firmada actual para la demo del hackathon.**
- Servir frontend y API en el **mismo origen** (CloudFront como origen único),
  conservando `SameSite=Lax` + `Secure` y las URLs relativas del cliente.
- `SESSION_SECRET` gestionado con **AWS Secrets Manager** en el despliegue.
- Añadir protección **CSRF** para mutaciones antes de exponer públicamente.
- **Diferir Amazon Cognito** a una fase posterior.

## Condiciones que obligarían a migrar a Cognito

- Necesidad de federación/SSO o proveedores externos de identidad.
- Requisito de MFA gestionado o cumplimiento que lo exija.
- Multi-tenancy con gestión de identidades a escala.
- Necesidad de tokens JWT verificados por el authorizer nativo de API Gateway en
  varios servicios.

## Alternativas

- Cognito desde el inicio: descartada para la demo por costo de reescritura
  (login, guards, manejo de tokens en cliente) sin beneficio inmediato.
- Auth en dominios separados (SPA y API): descartada; complica cookies
  (`SameSite=None; Secure` + CORS con credenciales).

## Consecuencias

- Cambios mínimos de código para la demo (la auth ya funciona).
- Requisitos de producción pendientes: `AUTH_ENFORCEMENT=on`, `SESSION_SECRET`
  en Secrets Manager, cookies `Secure`, CSRF. Ver `.kiro/steering/security.md`.
- La migración futura a Cognito queda registrada como opción, no como bloqueo.
