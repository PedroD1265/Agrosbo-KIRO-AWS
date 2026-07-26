# Design — multi-agent-workflow (Spec 16)

## 1. Introduccion

Este documento traduce los requisitos de `requirements.md` en un diseno
operativo para la gobernanza multiagente de AGROSBO. Define la topologia de
working trees, la matriz de permisos, los protocolos de comunicacion y los
mecanismos de control. No implementa codigo funcional.

## 2. Topologia de working trees

```text
D:\Pedro\AGROBO             ← Working tree principal (escritor: Kiro)
D:\Pedro\AGROBO-audit       ← Worktree de auditoria (solo lectura: Antigravity)
D:\Pedro\AGROBO-<agent>     ← Worktrees futuros (escritura delegada: Codex, etc.)
```

### Reglas de topologia

- El working tree principal tiene un unico agente escritor activo: Kiro.
- Antigravity opera en detached HEAD o en la misma rama, pero solo lectura.
- Cada agente escritor adicional requiere un worktree propio con rama dedicada.
- Los worktrees se crean solo con autorizacion humana explicita (REQ-F02).
- La creacion de un worktree implica una rama nueva y un ownership de archivos
  disjunto del escritor principal.
- El estado predeterminado es un solo escritor. Un segundo escritor no es
  automatico; requiere aprobacion humana explicita por instancia.
- El maximo de dos worktrees escritores es un limite de seguridad, no una
  autorizacion implicita.

## 3. Matriz de permisos por agente

| Agente | Lectura | Escritura | Commit | Push | PR | Merge | Deploy |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kiro | Si | Si (allowlist) | Solo con auth humana | Solo con auth humana | Solo con auth humana | No | No |
| Antigravity | Si | No | No | No | No | No | No |
| Codex | Si (propio wt) | Si (propio wt, allowlist) | Solo con auth humana | Solo con auth humana | Solo con auth humana | No | No |
| Copilot | Si | Sugerencias inline | No | No | Comentarios | No | No |
| Lovable | Aislado | Aislado (prototipo) | No | No | No | No | No |
| Replit | Aislado | Aislado (prototipo) | No | No | No | No | No |
| Gemini | Si (consulta) | No | No | No | No | No | No |
| ChatGPT | Si (consulta) | No | No | No | No | No | No |
| Humano | Si | Si | Si | Si | Si | Si | Si |

### Restriccion de implementer

Cualquier agente que actue como implementer (Kiro, Codex o futuro):

- Escribe **unicamente** dentro de la allowlist aprobada para la tarea actual.
- El acceso potencial a herramientas (read_file, fs_write, etc.) NO equivale a
  autorizacion efectiva de escritura.
- Una tarea NO debe otorgar allowlist simultanea sobre todos los directorios
  principales (`api/`, `web/`, `shared/`, `infra/`). Las tareas se disenan con
  el alcance minimo necesario.
- Cuando una tarea requiere cambios en multiples directorios, la allowlist
  explicita nombra los archivos o patrones especificos, no directorios completos.

## 4. Clasificacion de comandos

### 4.1 Automaticamente seguros (sin autorizacion)

```text
git status [--short|-sb|--porcelain]
git log [cualquier flag de solo lectura]
git diff [--check|--stat|--name-only|sin args]
git branch [--show-current|--list|-a]  (solo consulta)
git remote [-v]
git worktree list
git show [ref]
git rev-parse [cualquier flag]
git grep [patron]
npm run format        (check mode: prettier --check)
npm run lint
npm run typecheck
npm test
npm run test:memstorage
npm run test:integration
npm run build
npm run check:encoding
npm run db:check
Lectura de archivos (read_file, read_code, grep_search, file_search)
```

### 4.2 Requieren autorizacion humana

```text
git commit [-m "..."]
git push [-u origin branch]
git branch [crear/renombrar]
git tag [nombre]
git stash [push|pop|apply]
git checkout [rama] / git switch [rama]   (cambio de rama)
git worktree add [path] [branch]
gh pr create
npm install / npm ci
Cambios a package.json o package-lock.json
Creacion de archivos fuera de allowlist
```

### 4.3 Requieren tarea de schema/DB expresamente aprobada

```text
drizzle-kit generate
npm run db:migrate
npm run db:seed
```

Estos comandos no son automaticamente seguros. Solo se ejecutan dentro de una
tarea cuya allowlist incluya explicitamente trabajo de migracion o seed.

### 4.4 Requieren autorizacion cloud explicita (no permitidos en Fase 2)

```text
cdk bootstrap / cdk synth / cdk diff
aws [cualquier comando de escritura: create|delete|update|put|invoke]
```

Nota: `aws sts get-caller-identity` no forma parte del preflight rutinario;
solo se usa en tareas que expresamente requieran verificacion de identidad cloud.

### 4.5 Prohibidos sin excepcion

```text
git push --force / --force-with-lease
git reset --hard
git clean -fd / -fx
git branch -D [rama]
git rebase -i
git merge (por agente; solo humano o delegacion humana explicita)
cdk deploy
cdk destroy
aws [create|delete|update|put|invoke] (operaciones de escritura cloud)
rm -rf [directorio del proyecto]
DROP TABLE / ALTER TABLE (fuera de migraciones expresamente autorizadas)
Modificacion de .git/config
```

## 5. Protocolo de preflight

Secuencia obligatoria antes de cualquier escritura:

```powershell
git branch --show-current          # Verificar rama esperada
git status --short                 # Verificar tree limpio o cambios conocidos
git log -5 --oneline --decorate    # Verificar HEAD y contexto
git diff --check                   # Verificar ausencia de errores de whitespace
```

### Condiciones de fallo del preflight

| Condicion | Accion |
| --- | --- |
| Rama incorrecta | STOP REQUIRED |
| Cambios no reconocidos en working tree | STOP REQUIRED |
| HEAD no coincide con el esperado | STOP REQUIRED |
| Errores de whitespace detectados | Corregir si dentro de allowlist; STOP si no |

## 6. Protocolo de allowlist

### Estructura de una allowlist

```yaml
checkpoint: "2.1"
agent: "Kiro"
working_tree: "D:\\Pedro\\AGROBO"
branch: "chore/multi-agent-workflow"
files_create:
  - .kiro/specs/multi-agent-workflow/requirements.md
  - .kiro/specs/multi-agent-workflow/design.md
  - .kiro/specs/multi-agent-workflow/tasks.md
  - docs/roadmap/phase-2-execution-runbook.md
files_modify: []
files_prohibited:
  - api/src/**
  - web/src/**
  - shared/**
  - infra/src/**
  - migrations/**
  - package.json
  - package-lock.json
```

La allowlist se define en el runbook o en la tarea explicita del humano. El
agente no puede ampliarla unilateralmente.

## 7. Protocolo de handoff

### Formato estructurado

```markdown
## Handoff Report

- **Fecha**: YYYY-MM-DD HH:MM UTC
- **Agente**: [nombre]
- **Rama**: [branch]
- **HEAD**: [short hash]
- **Checkpoint**: [id]
- **Estado**: [completado|parcial|bloqueado]

### Archivos inspeccionados
- [lista]

### Archivos creados
- [lista]

### Archivos modificados
- [lista]

### Decisiones aplicadas
- [lista]

### Validaciones
| Gate | Resultado |
| --- | --- |
| format | PASS/FAIL |
| encoding | PASS/FAIL |
| lint | PASS/FAIL |
| typecheck | PASS/FAIL |
| test | PASS/FAIL |
| build | PASS/FAIL |
| diff --check | PASS/FAIL |

### Ambiguedades o contradicciones
- [lista o "ninguna"]

### Git status
```
[salida de git status --short]
```

### Confirmacion
- [ ] No se realizo commit sin autorizacion
- [ ] No se realizo push sin autorizacion
- [ ] No se realizo merge sin autorizacion
- [ ] No se realizo deploy

### Condicion de parada
[frase exacta de parada o "Continuar al siguiente checkpoint"]
```

### Recepcion de handoff

El agente receptor debe:
1. Leer el handoff report.
2. Ejecutar preflight completo.
3. Verificar que HEAD y rama coinciden.
4. Verificar que los archivos reportados existen con el contenido esperado.
5. Solo entonces comenzar escritura.

## 8. Quality gates

### Gates obligatorios

| Gate | Comando | Criterio |
| --- | --- | --- |
| Format | `npm run format` | Exit 0 |
| Encoding | `npm run check:encoding` | Exit 0, sin BOM ni mojibake |
| Lint | `npm run lint` | 0 errores (warnings preexistentes aceptables) |
| Typecheck | `npm run typecheck` | Exit 0 |
| Unit tests | `npm test` | Todas las pruebas pasan |
| Build | `npm run build` | Exit 0 |
| Git check | `git diff --check` | Sin errores de whitespace |

### Cuando ejecutar

- **Al final de cada bloque de tareas**: todos los gates.
- **Antes de solicitar autorizacion de commit**: todos los gates.
- **Despues de cada archivo creado o modificado**: `git diff --check` y
  `npm run check:encoding` como minimo.

### Politica de fallos

- Un fallo en quality gate activa STOP REQUIRED si no es corregible dentro de
  la allowlist.
- No se desactivan reglas de lint, format o typecheck para superar un gate.
- No se modifican archivos fuera de la allowlist para corregir un gate.

## 9. Ownership de archivos

### Modelo de ownership

El ownership se asigna por checkpoint/tarea y es exclusivo:

```text
Checkpoint 2.1:
  Owner: Kiro
  Files:
    .kiro/specs/multi-agent-workflow/*    → Kiro (create)
    docs/roadmap/phase-2-execution-runbook.md → Kiro (create)

Future Checkpoint X (example):
  Owner: Codex (worktree AGROBO-codex, branch feat/codex-spike)
  Files:
    spikes/codex-spike-xyz/*             → Codex (create)
```

### Transferencia de ownership

1. El owner actual produce un handoff.
2. El humano autoriza la transferencia.
3. El nuevo owner ejecuta preflight.
4. El nuevo owner verifica estado.
5. Solo entonces comienza a escribir.

## 10. Worktrees para escritura paralela futura

### Creacion de un worktree

Requiere autorizacion humana explicita. Patron:

```powershell
git worktree add D:\Pedro\AGROBO-<agent> <branch-name>
```

### Reglas de worktrees paralelos

- Rama dedicada por worktree.
- Ownership de archivos disjunto (sin solapamiento).
- Cada worktree tiene su propio preflight.
- La integracion se hace via PR (humano merge a main).
- Conflictos se resuelven por el humano, nunca por agentes.

### Archivos excluidos de escritura paralela

Los siguientes archivos nunca pueden tener dos owners simultaneos. Solo un
escritor a la vez, con integracion secuencial obligatoria:

- `shared/schema.ts`
- `api/migrations/**`
- `package-lock.json`
- `docs/product/product-scope-v2.md`
- `docs/adr/**`
- `.kiro/specs/` (Spec activa en ejecucion)
- `.github/workflows/**`

### Limite inicial

Maximo dos worktrees activos simultaneamente (principal + uno adicional). El
worktree de auditoria no cuenta contra este limite ya que es solo lectura.

**Este maximo es un limite de seguridad, no una autorizacion automatica.** Cada
worktree adicional requiere aprobacion humana explicita e independiente.

## 11. Auditorias paralelas de solo lectura

### Modelo de auditoria

- Antigravity opera en `D:\Pedro\AGROBO-audit` (detached HEAD o tracking main).
- Puede ejecutar cualquier comando de solo lectura.
- Produce reportes de auditoria sin modificar archivos.
- Puede leer cualquier archivo del repositorio.
- No tiene restriccion de allowlist (es solo lectura).

### Productos de auditoria

- Reportes de revision (enviados via chat/documento externo, no escritos en el
  repo por Antigravity).
- Comentarios en PR (si autorizado por humano).
- Deteccion de contradicciones documentales.
- Verificacion de quality gates (lectura de resultados).

## 12. Limites de gobernanza

| Dimension | Limite inicial | Justificacion |
| --- | --- | --- |
| Agentes Kiro (configs) | 4 | Suficiente para dev, review, spike, docs |
| Skills | 5 | Evitar proliferacion sin valor claro |
| MCP servers nuevos | 0 | No crear nuevos en esta Spec |
| Steering duplicado en AGENTS.md | 0 | Docs extensos van a docs/agents/ |
| Worktrees escritores simultaneos | 2 | Principal + uno delegado |

### Evolucion de limites

Los limites se revisan al cerrar cada fase. Aumentar un limite requiere
justificacion documentada y autorizacion humana.

### Restriccion temporal sobre archivos de gobernanza

La creacion de AGENTS.md, CLAUDE.md, GEMINI.md, `.github/copilot-instructions.md`,
configuraciones de agentes (`.kiro/agents/`) y configuraciones de skills
(`.kiro/skills/`) esta prohibida **unicamente durante Checkpoints 2.1, 2.1A y
2.1B**. Estos archivos son entregables planificados de checkpoints posteriores
de Fase 2 (T13, T14, T15) con su propia allowlist y aprobacion humana.

## 13. Autoridad por materia y relacion con Steering

### Modelo de autoridad

La autoridad se resuelve por materia, no por cadena lineal:

| Materia | Fuente autoritativa |
| --- | --- |
| Alcance y horizontes | `docs/product/product-scope-v2.md` |
| Decisiones arquitectonicas | ADRs vigentes |
| Estado real CURRENT | Codigo, tests, CI, capability-status-matrix |
| Trabajo autorizado | Spec activa + runbook activo |
| Reglas permanentes del agente | Steering y AGENTS.md (futuro) |
| Reglas locales | AGENTS.md del directorio (futuro) |
| Prompt de tarea | Restringe, nunca contradice |

### Relacion con Steering

Esta Spec NO duplica contenido de `.kiro/steering/`. Las reglas de gobernanza
multiagente se mantienen en:

- `.kiro/specs/multi-agent-workflow/` — definicion formal.
- `docs/roadmap/phase-2-execution-runbook.md` — procedimiento operativo.

Steering conserva reglas de producto, tecnologia, seguridad, dominio y
estructura. La gobernanza multiagente es complementaria, no superpuesta.

Cuando se creen AGENTS.md u otros adaptadores (en una fase posterior), estos
solo contendran referencias cortas a la Spec y al runbook.

### Procedimiento de contradicciones

1. Identificar la materia afectada.
2. Consultar la tabla de autoridad.
3. Si afecta alcance/seguridad/arquitectura → STOP REQUIRED.
4. Si es mecanica/derivada → corregir documento inferior dentro de allowlist.
5. Si requiere modificar fuente superior → STOP REQUIRED.
6. Registrar en handoff report.

## 14. Diagrama de flujo de una sesion de escritura

```text
[Inicio de sesion]
       |
       v
[Leer runbook + ultimo handoff]
       |
       v
[Ejecutar preflight]
       |
       ├── Fallo → STOP REQUIRED
       |
       v (ok)
[Identificar checkpoint activo]
       |
       v
[Verificar allowlist]
       |
       v
[Ejecutar tareas del checkpoint]
       |
       v
[Ejecutar quality gates]
       |
       ├── Fallo corregible → Corregir (dentro de allowlist) → Re-run gates
       ├── Fallo no corregible → STOP REQUIRED
       |
       v (ok)
[Producir handoff report]
       |
       v
[STOP REQUIRED o continuar al siguiente checkpoint del bloque]
```

## 15. Trazabilidad Requirements → Design

| Requirement | Seccion de Design |
| --- | --- |
| REQ-A01–A05 | §2 Topologia, §9 Ownership, §10 Worktrees |
| REQ-B01–B04 | §13 Autoridad por materia |
| REQ-C01–C09 | §3 Matriz de permisos, §9 Ownership |
| REQ-D01–D02 | §5 Protocolo de preflight |
| REQ-E01–E03 | §6 Protocolo de allowlist |
| REQ-F01–F07 | §4 Clasificacion de comandos |
| REQ-G01–G05 | §4, §10 Worktrees |
| REQ-H01–H03 | §7 Protocolo de handoff |
| REQ-I01–I03 | §8 Quality gates |
| REQ-J01–J02 | §5, §8 (condiciones de STOP) |
| REQ-K01–K03 | §11 Auditorias |
| REQ-L01–L04 | §12 Limites de gobernanza |
| REQ-M01–M03 | §9 Ownership de archivos |
| REQ-N01 | §8, §12 (Definition of Done) |
| REQ-NEG01–NEG06 | §4 Clasificacion, §6 Allowlist, §12 Limites, §19 Restricciones (runbook) |

## 16. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
| --- | --- | --- |
| Gobernanza excesiva bloquea desarrollo | Alto | Limites minimos; revision por fase |
| Agente escribe fuera de allowlist | Medio | Preflight + hooks existentes |
| Conflictos entre worktrees paralelos | Medio | Ownership disjunto; merge solo humano |
| Handoff incompleto pierde contexto | Bajo | Formato estructurado obligatorio |
| Auditor no detecta contradiccion | Bajo | Quality gates automaticos como red |
