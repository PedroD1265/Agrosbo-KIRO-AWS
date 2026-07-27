# AGROSBO — Proceso de desarrollo con Kiro

> Última actualización: julio 2026 (Fase 2 en cierre).

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
- `product-agent-scope-v2` (completada, PR #3 merged; 85 IDs únicos;
  Requirements, Design y Tasks existen).
- `multi-agent-workflow` (en cierre, Checkpoint 2.6; simulacion runtime
  completada; auditoria final, CI remoto y merge pendientes; Requirements,
  Design y Tasks existen).

Fase 0 completó Checkpoints 0.2–0.15 y cerró con PR #3. Fase 1 cerrada con
PRs #4 y #5. Fase 2 (Spec 16) en cierre — Checkpoint 2.6, simulacion runtime
completada; auditoria final, CI y merge pendientes.

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

## Fases de proceso

### Fase 0 — Gobierno documental y técnico (cerrada)

Dirigida por el [runbook de Fase 0](../roadmap/phase-0-execution-runbook.md):
- Bloques 1–5 con puertas humanas.
- Una sola sesión escritora por working tree.
- Spec 15 formalizada y aprobada (PR #3 merged).
- Quality gates: format, encoding, lint, typecheck, test, build, diff --check.

### Fase 1 — Preparación de estación de trabajo (cerrada)

- Workstation readiness completada (PRs #4, #5 merged).
- Topología multiagente definida.
- Hooks de quality gates instalados.

### Fase 2 — Gobernanza multiagente (en cierre)

Dirigida por el [runbook de Fase 2](../roadmap/phase-2-execution-runbook.md) y
la Spec 16 ([Requirements](../../.kiro/specs/multi-agent-workflow/requirements.md),
[Design](../../.kiro/specs/multi-agent-workflow/design.md),
[Tasks](../../.kiro/specs/multi-agent-workflow/tasks.md)).

Checkpoint 2.6 en cierre. Simulacion runtime completada. Auditoria final, CI
remoto y merge pendientes.

Define cómo múltiples agentes de desarrollo colaboran de forma segura sobre el
repositorio. Las reglas operativas fundamentales son:

**Sesión única de escritura**
- Un solo agente escritor activo por working tree en todo momento.
- Auditorías paralelas de solo lectura (Antigravity en worktree separado).
- Escritura paralela autorizada solo con worktree propio, rama dedicada y
  ownership de archivos disjunto; requiere aprobación humana explícita.

**Preflight obligatorio**
- Antes de cualquier escritura: verificar rama, HEAD, status y whitespace.
- Fallo en preflight → STOP REQUIRED.

**Allowlist explícita por tarea**
- Cada checkpoint o tarea define qué archivos se pueden crear o modificar.
- El agente no puede ampliar la allowlist unilateralmente.
- Escribir fuera de allowlist → STOP REQUIRED.

**Ownership de archivos**
- Cada tarea declara ownership exclusivo.
- Dos agentes no pueden tener write-ownership sobre el mismo archivo.
- Transferencia requiere handoff + autorización humana + preflight del receptor.

**Clasificación de comandos**
- Seguros (sin autorización): git status/log/diff, npm run format/lint/
  typecheck/test/build/check:encoding, lectura de archivos.
- Restringidos (requieren autorización humana): git commit, push, branch
  (crear), tag, worktree add, gh pr create, npm install.
- Prohibidos (sin excepción): git push --force, reset --hard, clean -fd,
  branch -D, rebase -i, merge por agente, cdk deploy/destroy, escritura AWS.

**Quality gates**
- Obligatorios antes de cerrar un bloque: format, encoding, lint, typecheck,
  test, build, git diff --check.
- Fallo no corregible dentro de allowlist → STOP REQUIRED.
- No se desactivan reglas para superar un gate.

**Formato de handoff**
- Al final de cada sesión o bloque: rama, HEAD, archivos creados/modificados,
  validaciones, ambigüedades, git status, confirmación de no commit/push/deploy.
- Al reanudar: re-ejecutar preflight y verificar estado contra el handoff.

**STOP REQUIRED**
- Se aplica inmediatamente cuando: gate falla sin corrección posible, archivo no
  autorizado aparece, rama/HEAD incorrectos, contradicción de alcance/seguridad/
  arquitectura, se necesita decisión humana, se requiere código/schema/deps,
  secreto detectado, o se necesita commit/push/PR/merge/deploy.

**Autorización humana obligatoria**
- Commit, push, PR, merge y deploy solo con autorización humana explícita.
- Ningún agente puede hacer merge.

**Auditoría independiente**
- Antigravity produce revisión estructurada antes de merge.
- El humano es la autoridad final para aprobar.

**No duplicar**
- development-process.md es guía breve; la definición formal completa reside en
  la Spec 16 y el runbook de Fase 2 (enlaces arriba).
- No se duplica Steering ni se copian extensamente requirements.md o design.md.

## Configuracion Kiro materializada

Los cuatro perfiles fueron seleccionados y verificados en Kiro IDE:

Custom agents (`.kiro/agents/`):
- planner
- implementer
- aws-architect
- reviewer

Workspace skills (`.kiro/skills/`):
- repo-preflight
- quality-gates
- task-handoff
- pr-audit
- aws-change-plan

MCP nuevos: 0.

### Evidencia de deny runtime

El perfil reviewer bloqueo automaticamente `git add -n AGENTS.md` por regla deny
configurada en la skill pr-audit. El comando prohibido no se ejecuto y no
aparecio solicitud de autorizacion. `git merge-base main origin/main` continuo
permitido como comando seguro de solo lectura.

## Baseline técnico

- 165 pruebas aprobadas (132 unitarias + 7 MemStorage + 26 integración PG).
- Quality gates: format, encoding, lint (0 errores), typecheck, build, db:check.
- CI: GitHub Actions con quality-gates + integration-postgres.

## Evidencia conservada para la presentación

- Steering, Specs (EARS/Design/Tasks), ADRs y Spec map versionados.
- Auditoría de capacidades (`docs/reviews/current-capability-audit-v2.md`).
- Runbooks y checkpoints.
- Resultados de quality gates.
- Hooks deterministas.
- Auditorías independientes (Antigravity).
