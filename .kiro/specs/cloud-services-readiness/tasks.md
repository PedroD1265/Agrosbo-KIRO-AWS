# Tasks - cloud-services-readiness

Ejecución por checkpoints. No se crean recursos cloud. Commits locales.

## Grupo D — Documentación y gobernanza

- [x] D.1 Crear `docs/architecture/cloud-services-readiness-audit.md`.
  - Requisitos: R11.
- [x] D.2 Actualizar README, Steering (8), spec-map, architecture docs.
  - Requisitos: R11.
- [x] D.3 Crear ADRs 010-013.
  - Requisitos: R11.
- [x] D.4 Crear esta Spec (requirements/design/tasks).
  - Requisitos: R11.

## Grupo P — Provider Boundaries [depende de D]

- [ ] P.1 Crear `api/src/providers/identity/types.ts` (IdentityPrincipal,
  IdentityProvider interface).
  - Requisitos: R2, R12.
- [ ] P.2 Crear `api/src/providers/identity/local-session.ts`
  (LocalSessionIdentityProvider, refactor de auth.ts existente).
  - Requisitos: R2, R12, R1.
- [ ] P.3 Crear `api/src/providers/attachments/types.ts` (AttachmentStorage
  interface).
  - Requisitos: R2, R13.
- [ ] P.4 Crear `api/src/providers/attachments/local.ts`
  (LocalAttachmentStorage, refactor de attachments.ts).
  - Requisitos: R2, R13, R1.
- [ ] P.5 Crear `api/src/providers/documents/types.ts`
  (DocumentExtractionProvider, DocumentExtractionResult).
  - Requisitos: R2, R14.
- [ ] P.6 Crear `api/src/providers/documents/noop.ts`
  (NoOpDocumentExtraction).
  - Requisitos: R2, R14.
- [ ] P.7 Crear `api/src/providers/index.ts` (factory por config).
  - Requisitos: R2, R8.

## Grupo C — Configuración [paralelizable con P]

- [ ] C.1 Centralizar y validar configuración: nuevas variables
  (APP_AUTH_PROVIDER, VITE_API_BASE_URL, ATTACHMENTS_STORAGE_DRIVER,
  DOCUMENT_EXTRACTION_PROVIDER, COGNITO_*, ATTACHMENTS_S3_BUCKET,
  TEXTRACT_ENABLED, AZURE_DI_*).
  - Requisitos: R8, R3.
- [ ] C.2 Actualizar `.env.example` con todas las variables documentadas.
  - Requisitos: R8.
- [ ] C.3 Fail-closed para producción (reject arranque con config insegura).
  - Requisitos: R3.

## Grupo M — Migraciones [depende de C parcialmente]

- [ ] M.1 Crear `api/drizzle.config.ts`.
  - Requisitos: R4.
- [ ] M.2 Generar migración inicial (snapshot del schema actual).
  - Requisitos: R4.
- [ ] M.3 Añadir scripts npm: `db:generate`, `db:migrate`, `db:check`.
  - Requisitos: R4.
- [ ] M.4 Probar: base vacía → migraciones → seed → API funcional → segunda
  aplicación sin cambios destructivos.
  - Requisitos: R4.

## Grupo I — Idempotencia [depende de M]

- [ ] I.1 Corregir orphan cleanup (expiración explícita, no borrado
  indiscriminado).
  - Requisitos: R5.
- [ ] I.2 Asegurar atomicidad claim→efecto→complete dentro de transacción.
  - Requisitos: R5.
- [ ] I.3 Añadir tests concurrentes: 2 y 10 solicitudes simultáneas, fallo
  post-claim, confirmación perdida, retry 409, claves independientes.
  - Requisitos: R5, R15.
- [ ] I.4 Verificar semántica compatible memoria/PostgreSQL.
  - Requisitos: R15.

## Grupo H — Health y runtime [depende de P]

- [ ] H.1 Implementar `GET /health/live` (proceso activo, sin DB).
  - Requisitos: R7.
- [ ] H.2 Implementar `GET /health/ready` (config + schema + storage).
  - Requisitos: R7.
- [ ] H.3 Eliminar endpoints `/health` ambiguos actuales.
  - Requisitos: R7.
- [ ] H.4 Fail-closed Lambda init (no initialized=true tras error; no tráfico
  parcial; log estructurado sin secretos).
  - Requisitos: R6.
- [ ] H.5 Import dinámico de Vite (solo dev).
  - Requisitos: R6.

## Grupo A — API client [depende de C, P]

- [ ] A.1 `VITE_API_BASE_URL` en frontend; default '' (dev local).
  - Requisitos: R8.
- [ ] A.2 AuthTokenProvider interface + LocalSessionAuthProvider.
  - Requisitos: R12.
- [ ] A.3 queryClient y sync engine inyectan auth header si token presente.
  - Requisitos: R12.
- [ ] A.4 401 produce sesión expirada (mantener comportamiento actual).
  - Requisitos: R1.

## Grupo CI — Integración [depende de M, I]

- [ ] CI.1 Añadir job `integration` con PostgreSQL service container al
  workflow.
  - Requisitos: R9.
- [ ] CI.2 Ejecutar migraciones + seed + tests integración + idempotencia.
  - Requisitos: R9.

## Grupo V — Validación final

- [ ] V.1 Ejecutar todos los gates (clean/format/lint/typecheck/test/build).
  - Requisitos: R1.
- [ ] V.2 Verificar login local, cola offline, RBAC funcionan.
  - Requisitos: R1.
- [ ] V.3 Crear commits locales separados.
  - Requisitos: R11.
- [ ] V.4 Entregar informe (27 puntos).

## Paralelización

- Grupo P y Grupo C son paralelizables.
- Grupo M depende parcialmente de C (config de DB).
- Grupo I depende de M (migraciones para test con Postgres real).
- Grupo H depende de P (providers para readiness check).
- Grupo A depende de C y P.
- Grupo CI depende de M e I.
- Grupo V es final.

## Fuera de alcance

- Crear recursos AWS/Azure.
- Implementar Cognito, S3, Textract, Azure DI, Bedrock.
- Marketplace, servicios, mensajería, pagos, WebSocket.
- Endpoints espaciales (Spec #4).
- Tenancy completo (Spec #2).
