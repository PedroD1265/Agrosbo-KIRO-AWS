# AGROSBO - Plan de multi-tenancy (futuro)

Arquitectura futura. **No se implementa** en la fase de estabilización ni se
modifica el esquema todavía. Hoy la organización está fijada a `org-default`.

## Estado actual

- Existen tablas `organizations` y `farms` (con FK a organización) en
  `shared/schema.ts`, pero el código usa `ORG_ID = "org-default"` fijo
  (`api/src/dbStorage.ts`, `api/src/auth.ts`). No hay aislamiento por membresía.

## Modelo mínimo propuesto

- `organizations` (existe).
- `farms` (existe; FK a organización).
- `organization_memberships` (usuario ↔ organización, con rol). **Nuevo.**
- `farm_memberships` (usuario ↔ granja, con rol). **Nuevo.**
- `users` (existe; `orgId`).
- `roles` (hoy vía enum `userRole`).

## Reglas

- Ningún registro de producción debe depender permanentemente de `org-default`.
- Cada consulta debe quedar **limitada por membresía** (organización/granja).
- El marketplace separa propietario y contraparte (organizaciones distintas).
- El asistente respeta organización, granja y RBAC.
- Los archivos (adjuntos) también se aíslan por organización.
- Los IDs en la URL **no** conceden acceso por sí mismos (autorización por
  membresía, no por conocimiento del ID).

## Impacto (cuando se implemente)

- Migración de datos para asignar organización real.
- Filtro transversal por organización en la capa de acceso a datos.
- Ajustes en auth (claim de organización activa) y en RBAC (rol por organización/
  granja).
- Aislamiento de adjuntos por prefijo de organización en S3.

## Secuencia recomendada

Se aborda en la Spec `authentication-tenancy-and-security` (#2), después de la
estabilización y antes de exponer comercio/mensajería multiusuario.
