# AGROSBO — Proceso de desarrollo con Kiro

> Última actualización: julio 2026 (Fase 0).

Documenta cómo Kiro guía la ingeniería de AGROSBO. Solo se describen usos reales
o aprobados. No se inventan estadísticas de productividad.

## Steering (`.kiro/steering/`)

Ocho documentos que fijan intención y reglas: `product`, `tech`, `structure`,
`domain-rules`, `offline-first`, `data-integrity`, `security`, `hackathon-scope`.
Enlazan al contrato canónico (`docs/product/product-scope-v2.md`) como fuente de
verdad del alcance.

## Specs (`.kiro/specs/`)

Cada unidad de trabajo se formaliza como Spec con:
- **Requirements** en notación **EARS** (SHALL / WHEN / IF-THEN).
- **Design** (componentes, interfaces, flujos, límites, validación).
- **Tasks** (checkpoints, dependencias, criterios de terminado).

Requirements → Design → Tasks siempre secuencial; nunca en paralelo.

Specs materializadas (carpeta y archivos existen):
- `project-foundation-and-risk-spikes` (histórica).
- `platform-stabilization-and-governance` (completada).
- `cloud-services-readiness` (completada, PR #2).

Próxima Spec de Fase 0 (todavía no materializada):
- `product-agent-scope-v2` — Requirements se crearán en Checkpoint 0.9, Design
  en 0.10, Tasks en 0.11. Siempre secuencial.

Mapa completo: [`docs/spec-map.md`](../spec-map.md). Secuencia aprobada: Specs
15–31 en [`docs/roadmap/delivery-roadmap-v2.md`](../roadmap/delivery-roadmap-v2.md).

## ADRs (`docs/adr/`)

Decisiones arquitectónicas registradas y versionadas:
- 001–005: históricos.
- 006–009: giro, serverless, auth, modularidad.
- 010–013: Cognito, Amplify (superseded por 016), cloud boundaries, doc extraction.
- 014–018: alcance P0/P1/P2, modelo de acción del agente, hosting S3+CF+OAC,
  colaboradores externos, límites de inteligencia agrícola.

## Hooks (`.kiro/hooks/`)

Quality gates deterministas, sin IA ni despliegue:
- `format-check`, `lint-check`, `typecheck` (PostFileSave).
- `compile-check`, `unit-tests` (Stop).
- `secret-scan` (PreToolUse; bloquea commit/push con secretos staged).

## Fase 0 — Proceso documental actual

Dirigida por el [runbook](../roadmap/phase-0-execution-runbook.md):
- Bloques 1–5 con puertas humanas.
- Una sola sesión escritora por working tree.
- Paralelismo de escritura solo con worktree, rama y ownership separados.
- Ningún agente hace commit, push, PR, merge o deploy sin autorización.
- Spec 16 (multi-agent-workflow) definirá el workflow detallado de colaboración
  entre agentes de desarrollo (Kiro, Codex, Antigravity, Lovable) después de
  Fase 0; no es entregable del runbook actual.

## Baseline técnico

- 165 pruebas aprobadas (132 unitarias + 7 MemStorage + 26 integración PG).
- Quality gates: format, encoding, lint (0 errores), typecheck, build, db:check.
- CI: GitHub Actions con quality-gates + integration-postgres.

## Evidencia conservada para la presentación

- Steering, Specs (EARS/Design/Tasks), ADRs y Spec map versionados.
- Auditoría de capacidades (`docs/reviews/current-capability-audit-v2.md`).
- Runbook y checkpoints.
- Resultados de quality gates.
- Hooks deterministas.
