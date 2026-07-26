# Requirements — multi-agent-workflow (Spec 16)

## 1. Introduccion

Esta Spec define las reglas de gobernanza para la operacion multiagente de
AGROSBO. Establece quien puede escribir, donde, cuando y bajo que controles.
No implementa capacidades P0/P1 ni modifica codigo funcional.

## 2. Alcance

- Gobernanza de multiples agentes de desarrollo y revision.
- Ownership de archivos y working trees.
- Politica Git (ramas, commits, push, merge, PR).
- Formato de handoff entre sesiones y agentes.
- Quality gates obligatorios.
- Limites de gobernanza minima.

## 3. Fuera de alcance

- Implementacion de funcionalidades P0 o P1.
- Creacion de CDK stacks, Lambda, componentes React, schemas o migraciones.
- Despliegue AWS.
- Instalacion de dependencias.
- Modificacion de codigo funcional en `api/src`, `web/src`, `shared` o `infra/src`.

## 4. Autoridad por materia

La autoridad no es una cadena lineal unica. Cada materia tiene su fuente
autoritativa:

| Materia | Fuente autoritativa |
| --- | --- |
| Alcance y horizontes (CURRENT/P0/P1/P2) | `docs/product/product-scope-v2.md` |
| Decisiones arquitectonicas | ADRs vigentes (Accepted, no Superseded) |
| Estado real CURRENT | Codigo, tests, CI y `docs/product/capability-status-matrix.md` |
| Trabajo autorizado | Spec activa aprobada + checkpoint/runbook activo |
| Reglas permanentes del agente | Steering (`.kiro/steering/`) y AGENTS.md (cuando exista) |
| Reglas locales por directorio | AGENTS.md mas especifico del directorio (cuando exista) |
| Prompt de tarea | Puede restringir o acotar, nunca contradecir fuentes superiores |

### Jerarquia general de precedencia (cuando las materias se solapan)

1. `docs/product/product-scope-v2.md` (contrato canonico de alcance).
2. ADRs vigentes.
3. Codigo, tests y CI (evidencia de estado implementado).
4. Spec activa aprobada y runbook activo.
5. Steering.
6. Documentos de arquitectura y producto derivados.
7. README y demo.

### Procedimiento de resolucion de contradicciones

1. Identificar la materia en cuestion.
2. Determinar la fuente autoritativa para esa materia (tabla anterior).
3. Si la contradiccion es entre dos fuentes de la misma materia, prevalece la
   mas especifica y reciente.
4. Si la contradiccion afecta alcance, seguridad o arquitectura:
   aplicar STOP REQUIRED y reportar al humano.
5. Si la contradiccion es mecanica o derivada (typo, estado desactualizado):
   corregir el documento de menor autoridad dentro de la allowlist activa.
6. Si la correccion requiere modificar una fuente superior o un archivo fuera de
   la allowlist: aplicar STOP REQUIRED.
7. Registrar toda contradiccion detectada y su resolucion en el handoff report.

## 5. Glosario

| Termino | Definicion |
| --- | --- |
| Agente escritor | Sesion activa con permisos de escritura sobre un working tree |
| Agente auditor | Sesion de solo lectura que revisa sin modificar |
| Working tree | Copia de trabajo de Git asociada a una rama |
| Worktree | Working tree adicional creado con `git worktree add` |
| Handoff | Transferencia estructurada de contexto entre sesiones o agentes |
| Preflight | Verificacion de solo lectura antes de cualquier escritura |
| Allowlist | Lista explicita de archivos permitidos para un checkpoint |
| Quality gate | Comando de validacion que debe pasar antes de avanzar |
| STOP REQUIRED | Condicion que obliga a detener toda escritura |

## 6. Actores

| Actor | Rol | Tipo |
| --- | --- | --- |
| Kiro | Agente de desarrollo principal; unico escritor autorizado | Escritor |
| Antigravity | Auditor independiente de solo lectura en worktree separado | Auditor |
| Codex | Agente de desarrollo delegado (escritura solo en worktree propio) | Escritor condicional |
| Copilot | Asistencia inline y revision de PR | Advisor |
| Lovable | Prototipado UI aislado; sin DB/Auth/Cloud | Prototipador |
| Replit | Prototipos aislados; sin DB/Auth/Cloud | Prototipador |
| Gemini | Consultas puntuales y revision conceptual | Advisor |
| ChatGPT | Supervision, revision conceptual, arbitraje documental | Supervisor |
| Humano | Autoridad final; aprueba commits, push, PR, merge, deploy | Autoridad |

## 7. Requisitos EARS

### A. Sesion unica de escritura y concurrencia

**REQ-A01**: THE SYSTEM SHALL enforce a single active writer session per working
tree as the default state. No second writer is authorized without explicit human
approval.
Source: phase-0-execution-runbook §17; workstation-readiness §2.

**REQ-A02**: WHEN a second writer is authorized by explicit human approval, THE
SYSTEM SHALL require: a separate worktree, a dedicated branch, disjoint file
ownership (allowlists without overlap), and integration via sequential PR merge.
Source: phase-0-execution-runbook §17.

**REQ-A03**: THE SYSTEM SHALL NOT allow two agents to modify the same file in
the same commit window, regardless of worktree separation.
Source: phase-0-execution-runbook §17.

**REQ-A04**: THE FOLLOWING files SHALL be excluded from parallel write ownership
under all circumstances (only one writer at a time, always sequentially
integrated):
- `shared/schema.ts`
- `api/migrations/**`
- `package-lock.json`
- `docs/product/product-scope-v2.md`
- `docs/adr/**`
- `.kiro/specs/` (active Spec being executed)
- `.github/workflows/**`
Source: data-integrity concerns; single source of schema truth.

**REQ-A05**: THE MAXIMUM of two simultaneous writer worktrees (principal + one
delegated) is a safety limit, not an automatic authorization. Each activation
requires separate explicit human approval.
Source: task authorization.

### B. Autoridad por materia y contradicciones

**REQ-B01**: THE SYSTEM SHALL resolve authority by subject matter: product-
scope-v2 for scope/horizons, ADRs for architecture decisions, code/tests/CI for
CURRENT state, active Spec+runbook for authorized work, Steering for permanent
agent rules.
Source: product-scope-v2 §18; this Spec §4.

**REQ-B02**: WHEN an agent detects a contradiction, THE AGENT SHALL follow the
resolution procedure defined in §4: identify subject, determine authoritative
source, apply STOP REQUIRED if it affects scope/security/architecture, or
correct the lower-authority document within the allowlist if mechanical.
Source: phase-0-execution-runbook §2.2; this Spec §4.

**REQ-B03**: THE SYSTEM SHALL treat code and tests as authoritative evidence of
CURRENT state and documents as evidence of approved intent. Neither overrides
the other without explicit reconciliation.
Source: product-scope-v2 §18.

**REQ-B04**: A task prompt MAY restrict or narrow scope but SHALL NOT contradict
higher-authority sources (product-scope-v2, ADRs, active Spec).
Source: this Spec §4.

### C. Responsabilidades por agente

**REQ-C01**: Kiro SHALL be the sole writer on the main working tree
(`D:\Pedro\AGROBO`).
Source: task authorization, workstation-readiness §10.

**REQ-C02**: Antigravity SHALL operate exclusively in read-only mode on its
dedicated worktree (`D:\Pedro\AGROBO-audit`).
Source: task authorization.

**REQ-C03**: Codex SHALL write only to a dedicated worktree with its own branch
and SHALL NOT share file ownership with Kiro's active checkpoint.
Source: delivery-roadmap-v2 Spec 16 description.

**REQ-C04**: Copilot SHALL be restricted to inline suggestions and PR review
comments; SHALL NOT commit, push or merge autonomously.
Source: workstation-readiness §10.

**REQ-C05**: Lovable and Replit SHALL be restricted to isolated prototyping;
SHALL NOT connect to production databases, authentication systems or cloud
services.
Source: workstation-readiness §10.

**REQ-C06**: Gemini and ChatGPT SHALL provide advisory input only; SHALL NOT
write to any working tree directly.
Source: workstation-readiness §10.

**REQ-C07**: THE HUMAN SHALL be the sole authority for commits, push, PR
creation, merge, deploy and resource creation.
Source: phase-0-execution-runbook §6.

**REQ-C08**: ANY agent acting as implementer (Kiro, Codex or future) SHALL write
only within the allowlist approved for its current task. Potential tool access to
`api/src`, `web/src`, `shared` and `infra/src` does NOT constitute authorization
to write there. Authorization is granted exclusively by the active task's
allowlist.
Source: phase-0-execution-runbook §8; this Spec §4.

**REQ-C09**: AN IMPLEMENTER SHALL NOT hold simultaneous write authorization over
all of `api/`, `web/`, `shared/` and `infra/`. Tasks SHALL be scoped so that a
single task's allowlist covers only the directories necessary for that task.
Source: task authorization; principle of least privilege.

### D. Preflight obligatorio

**REQ-D01**: BEFORE any write operation, the active writer agent SHALL execute a
read-only preflight consisting of at minimum: `git branch --show-current`,
`git status --short`, `git log -5 --oneline --decorate`, `git diff --check`.
Source: phase-0-execution-runbook §3.1.

**REQ-D02**: IF the preflight reveals unexpected changes, uncommitted files or
wrong branch, THE AGENT SHALL apply STOP REQUIRED.
Source: phase-0-execution-runbook §10.3.

### E. Allowlists por tarea

**REQ-E01**: EACH checkpoint or task SHALL define an explicit allowlist of files
that may be created or modified.
Source: phase-0-execution-runbook §8.

**REQ-E02**: THE AGENT SHALL NOT create or modify files outside the active
allowlist without explicit human authorization.
Source: phase-0-execution-runbook §8.

**REQ-E03**: IF a task requires modifying a file outside its allowlist, THE
AGENT SHALL apply STOP REQUIRED and request authorization.
Source: phase-0-execution-runbook §10.3.

### F. Comandos seguros, restringidos y prohibidos

**REQ-F01**: THE FOLLOWING commands SHALL be automatically safe (no
authorization required): `git status`, `git log`, `git diff`, `git branch`
(list/show), `git remote`, `git worktree list`, `git show`, `git rev-parse`,
`git grep`, `npm run format` (check mode), `npm run lint`, `npm run typecheck`,
`npm test`, `npm run test:memstorage`, `npm run test:integration`,
`npm run build`, `npm run check:encoding`, `npm run db:check`, file reads,
grep/search.
Source: phase-0-execution-runbook §7.2.

**REQ-F02**: THE FOLLOWING commands SHALL require explicit human authorization:
`git commit`, `git push`, `git branch` (create/rename), `git tag`,
`git stash`, `git checkout`/`git switch` (branch change),
`git worktree add`, `gh pr create`, `npm install`, `npm ci`,
changes to `package.json` or `package-lock.json`.
Source: phase-0-execution-runbook §6.

**REQ-F03**: THE FOLLOWING commands SHALL be prohibited without exception:
`git push --force`/`--force-with-lease`, `git reset --hard`, `git clean -fd`,
`git branch -D`, `git rebase -i`, `cdk deploy`, `cdk destroy`,
AWS CLI write operations (`create|delete|update|put|invoke`),
`rm -rf` on project directories, modification of `.git/config`.
Source: phase-0-execution-runbook §6, §7.1.

**REQ-F04**: `git merge` and PR close/merge SHALL be restricted to human-only
or explicit human-delegated authorization per instance. No agent may merge
autonomously.
Source: phase-0-execution-runbook §6.

**REQ-F05**: `drizzle-kit generate`, `npm run db:migrate` and `npm run db:seed`
SHALL require an expressly approved schema/database task. They are not
automatically safe even within an implementation task unless the task's allowlist
explicitly includes migration or seed work.
Source: data-integrity; phase-0-execution-runbook §5.

**REQ-F06**: `cdk bootstrap`, `cdk synth`, `cdk diff` and all AWS CLI write
commands SHALL require explicit cloud authorization. They are not permitted in
Fase 2.
Source: phase-0-execution-runbook §7.1; task authorization.

**REQ-F07**: `aws sts get-caller-identity` SHALL NOT be included in routine
preflight. It is permitted only within tasks that expressly require cloud
identity verification.
Source: task authorization; principle of minimum external calls.

### G. Politica Git

**REQ-G01**: THE SYSTEM SHALL NOT allow any agent to commit, push, create PR,
merge or deploy without explicit human authorization per operation.
Source: phase-0-execution-runbook §6.

**REQ-G02**: WHEN committing, THE AGENT SHALL stage specific files by name;
SHALL NOT use `git add .` or `git add -A`.
Source: phase-0-execution-runbook §6.

**REQ-G03**: THE AGENT SHALL use conventional commit messages following the
existing project convention (`type(scope): description`).
Source: CI and existing commit history.

**REQ-G04**: THE AGENT SHALL push only to feature branches; SHALL NOT push
directly to `main`.
Source: workstation-readiness §5.

**REQ-G05**: WHEN multiple agents work in parallel, EACH agent SHALL operate on
a separate branch with no overlapping file modifications.
Source: phase-0-execution-runbook §17.

### H. Formato de handoff

**REQ-H01**: AT THE END of each session or task block, THE AGENT SHALL produce a
structured handoff report containing: branch, HEAD, checkpoint status, files
inspected, files created/modified, decisions made, validations passed/failed,
ambiguities, git status.
Source: phase-0-execution-runbook §15.

**REQ-H02**: THE HANDOFF SHALL explicitly confirm that no commit, push, PR or
deploy occurred unless authorized.
Source: phase-0-execution-runbook §15.

**REQ-H03**: WHEN resuming from a handoff, THE AGENT SHALL re-execute preflight
and verify state matches the handoff report before writing.
Source: phase-0-execution-runbook §16.

### I. Quality gates

**REQ-I01**: THE FOLLOWING quality gates SHALL pass before any task block is
considered complete: `npm run format`, `npm run check:encoding`, `npm run lint`,
`npm run typecheck`, `npm test`, `npm run build`.
Source: workstation-readiness §12, CI workflow.

**REQ-I02**: WHEN a quality gate fails, THE AGENT SHALL stop and report the
failure; SHALL NOT disable the rule or skip the gate.
Source: phase-0-execution-runbook §11.2.

**REQ-I03**: THE AGENT SHALL run `git diff --check` after all file modifications
to detect whitespace errors.
Source: phase-0-execution-runbook §3.1.

### J. STOP REQUIRED

**REQ-J01**: THE AGENT SHALL apply STOP REQUIRED immediately when:
- a quality gate fails and cannot be fixed within the allowlist;
- an unauthorized file appears in the working tree;
- the branch or HEAD is not the expected value;
- a contradiction of scope, security or architecture is detected;
- a human decision is required;
- code, schema or dependency changes are needed;
- a secret is detected in staged files;
- commit, push, PR, merge or deploy is needed.
Source: phase-0-execution-runbook §10.3.

**REQ-J02**: AFTER applying STOP REQUIRED, THE AGENT SHALL produce a report
explaining the condition and wait for human resolution.
Source: phase-0-execution-runbook §10.3.

### K. Revision de PR

**REQ-K01**: EVERY PR SHALL be reviewed by at least the human author and one
additional reviewer (which may be an auditor agent or Copilot).
Source: workstation-readiness §5.

**REQ-K02**: THE AUDITOR (Antigravity) SHALL produce a structured review report
for every PR before merge authorization.
Source: task authorization.

**REQ-K03**: THE SYSTEM SHALL NOT allow merge without human explicit
authorization, regardless of review status.
Source: phase-0-execution-runbook §6.

### L. Gobernanza minima

**REQ-L01**: THE SYSTEM SHALL support a maximum of four (4) concurrent Kiro
agent configurations initially.
Source: task authorization.

**REQ-L02**: THE SYSTEM SHALL support a maximum of five (5) skills initially.
Source: task authorization.

**REQ-L03**: THE SYSTEM SHALL NOT create new MCP server configurations as part
of this Spec.
Source: task authorization.

**REQ-L04**: THE SYSTEM SHALL NOT duplicate Steering content within AGENTS.md or
equivalent files; extended documentation SHALL reside in `docs/agents/` with
short adapter references per tool.
Source: task authorization.

### M. Ownership de archivos

**REQ-M01**: EACH active task SHALL declare which agent owns each file in its
allowlist.
Source: phase-0-execution-runbook §17.

**REQ-M02**: TWO agents SHALL NOT have write ownership over the same file at the
same time.
Source: phase-0-execution-runbook §17.

**REQ-M03**: WHEN ownership needs to transfer, THE CURRENT OWNER SHALL produce a
handoff and THE RECEIVING AGENT SHALL verify state via preflight before
accepting.
Source: phase-0-execution-runbook §16, §17.

### N. Definition of Done — Fase 2

**REQ-N01**: THE PHASE 2 SHALL be considered complete when:
- all requirements in this Spec are documented and operational;
- the phase-2-execution-runbook exists and is consistent;
- quality gates are green;
- no functional code has been modified;
- no dependencies have been installed;
- no commits, push, PR or deploy have occurred without authorization;
- the governance model is minimal and non-blocking for subsequent development.
Source: task authorization.

## 8. Requisitos negativos

**REQ-NEG01**: THE SYSTEM SHALL NOT allow any agent to execute destructive Git
commands without explicit human authorization.

**REQ-NEG02**: THE SYSTEM SHALL NOT allow governance overhead to block P0
delivery timelines.

**REQ-NEG03**: THE SYSTEM SHALL NOT create AGENTS.md, CLAUDE.md, GEMINI.md,
`.github/copilot-instructions.md`, agent configurations or skill configurations
during Checkpoints 2.1, 2.1A and 2.1B. Their creation is reserved for later
Phase 2 checkpoints with explicit allowlist and human approval (see T13–T15).
Source: task authorization (temporal restriction).

**REQ-NEG04**: THE SYSTEM SHALL NOT install dependencies or modify package.json.

**REQ-NEG05**: THE SYSTEM SHALL NOT modify functional source code in api/src,
web/src, shared or infra/src.

**REQ-NEG06**: DURING Phase 2, the following restrictions apply independently
and unconditionally (not related to REQ-NEG03 temporal scope):
- zero implementation of P0/P1 capabilities;
- zero changes to `api/src/`;
- zero changes to `web/src/`;
- zero changes to `shared/` (code files);
- zero changes to `api/migrations/`;
- zero database schema changes;
- zero new dependencies (no `npm install`, no `package.json` modifications);
- zero new MCP server configurations;
- zero creation or modification of AWS resources.
Source: task authorization; phase-0-execution-runbook §5.

## 9. Trazabilidad

| Requirement | Source document | Section |
| --- | --- | --- |
| REQ-A01–A05 | phase-0-execution-runbook, task auth | §17 |
| REQ-B01–B04 | product-scope-v2, this Spec | §18, §4 |
| REQ-C01–C09 | workstation-readiness, task auth, this Spec | §10, §2, §4 |
| REQ-D01–D02 | phase-0-execution-runbook | §3.1, §10.3 |
| REQ-E01–E03 | phase-0-execution-runbook | §8 |
| REQ-F01–F07 | phase-0-execution-runbook, task auth | §6, §7, §5 |
| REQ-G01–G05 | phase-0-execution-runbook, workstation-readiness | §6, §5 |
| REQ-H01–H03 | phase-0-execution-runbook | §15, §16 |
| REQ-I01–I03 | workstation-readiness, CI | §12 |
| REQ-J01–J02 | phase-0-execution-runbook | §10.3 |
| REQ-K01–K03 | workstation-readiness, task auth | §5 |
| REQ-L01–L04 | task authorization | — |
| REQ-M01–M03 | phase-0-execution-runbook | §17 |
| REQ-N01 | task authorization | — |
| REQ-NEG01–NEG06 | phase-0-execution-runbook, task auth | §5, §6, §7 |
