# Tasks - platform-stabilization-and-governance

Ejecución por checkpoints con autorización explícita. Esta fase NO incluye
infraestructura, despliegue ni dominios funcionales nuevos.

## S0 - Respaldo e inventario
- [x] S0.1 Inspección git (status, diff, ls-files, clean -nd, log, remote).
  - Requisitos: R12.
- [x] S0.2 Escaneo de secretos y archivos sensibles.
  - Requisitos: R11.
- [x] S0.3 Respaldo externo del working tree (excluyendo artefactos regenerables
  y secretos). Verificar integridad.
  - Requisitos: R12.

## S1 - Producto y README  [depende de S0]
- [x] S1.1 Reescribir README con el producto real y las 26 secciones.
  - Requisitos: R1, R7, R8.

## S2 - Steering  [paralelizable con S3, S4, S5]
- [x] S2.1 Actualizar los 8 archivos de steering (implemented/target/deferred).
  - Requisitos: R1, R6, R7, R8.

## S3 - ADRs  [paralelizable]
- [x] S3.1 Crear ADR 006 (pivote), 007 (serverless), 008 (auth), 009
  (modularidad).
  - Requisitos: R2.
- [x] S3.2 Añadir estado de supersesión a ADR 001-005.
  - Requisitos: R2.

## S4 - Spec map  [paralelizable]
- [x] S4.1 Reescribir `docs/spec-map.md` (14 specs, core/differentiator/future).
  - Requisitos: R1.
- [x] S4.2 Crear esta Spec (requirements/design/tasks).
  - Requisitos: R1, R2.

## S5 - Documentos adicionales  [paralelizable]
- [x] S5.1 `docs/product/{vision-and-scope, hackathon-demo-story}.md`.
- [x] S5.2 `docs/architecture/{current-and-target, aws-service-plan,
  platform-evolution, spatial-gap-register, multi-tenancy-plan,
  farm-assistant-plan}.md`.
- [x] S5.3 `docs/kiro/development-process.md`, `docs/hackathon/judging-strategy.md`.
  - Requisitos: R4, R7, R8.

## S5b - Marketplace/servicios futuros (solo documentación)
- [x] S5b.1 Documentar dominios de comercio y servicios en
  `docs/architecture/platform-evolution.md` (sin implementar).
  - Requisitos: R9.

## S6 - Variables, metadata y hooks  [depende de S1]
- [x] S6.1 Reescribir `.env.example` (variables reales + diferidas).
  - Requisitos: R5.
- [x] S6.2 Normalizar metadata de `package.json` (descripción, scripts).
  - Requisitos: R11.
- [x] S6.3 Revisar/alinear hooks de Kiro (sin romper determinismo).
  - Requisitos: R11.

## S7 - Tests RBAC  [depende de S0; paralelizable con S1-S6]
- [ ] S7.1 Alinear aliases (Vite/TS/Vitest) para `@/lib/auth` en tests.
  - Requisitos: R3, R9.
- [ ] S7.2 Añadir verificación de resolución de alias compartido en test.
  - Requisitos: R3.

## S8 - Validación e informe  [depende de S1-S7]
- [ ] S8.1 Ejecutar format, lint, typecheck, test, build.
  - Requisitos: R11.
- [ ] S8.2 Inspección git (status, diff --stat, --name-status, --check) sin add.
  - Requisitos: R12.
- [ ] SZ.1 Informe final + propuesta de commits separados + checklist de
  autorización.
  - Requisitos: R12.

## Paralelización

- S2, S3, S4, S5 son documentales e independientes entre sí.
- S7 (tests) es independiente de la documentación.
- S8 requiere todo lo anterior.

## Fuera de alcance (NO ejecutar en esta Spec)

- Endpoints espaciales, infraestructura/CDK, despliegue, recursos AWS,
  migraciones, marketplace, servicios/maquinaria, mensajería, Bedrock, Cognito,
  esquema de tenancy, refactor masivo, git add/commit/push, ramas.
