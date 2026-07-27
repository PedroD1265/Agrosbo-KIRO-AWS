# AGROSBO Phase 2 Execution Runbook

> **Estado: COMPLETADA.**
>
> Fase 2 cerrada mediante PR #11.
> Merge commit: d3150a4.
> Quality gates e integration-postgres: SUCCESS.
> Auditoria independiente: PASS.

## Convenciones normativas

- **REQUISITO**: condicion obligatoria.
- **AUTORIZACION**: permiso humano explicito y limitado a un bloque.
- **PROHIBICION**: accion no permitida.
- **STOP REQUIRED**: detener toda escritura y devolver un informe.
- **HITO INTERNO**: checkpoint que Kiro completa y valida sin detenerse.
- **PUERTA HUMANA**: limite de bloque donde Kiro debe detenerse.
- **APROBADO**: solo existe cuando el prompt humano mas reciente lo declara.

## 1. Proposito

Este runbook dirige la Fase 2 de AGROSBO: gobernanza y operacion multiagente.
Define como multiples agentes de desarrollo colaboran de forma segura sobre el
mismo repositorio sin conflictos, perdida de contexto ni acciones no autorizadas.

La Spec formal es `.kiro/specs/multi-agent-workflow/` (requirements.md,
design.md, tasks.md).

## 2. Prerrequisitos

- Fase 0: COMPLETADA (PR #3 merged o draft aprobado).
- Fase 1: COMPLETADA (PR #4, #5 merged; workstation-readiness cerrado).
- Rama de trabajo inicial: `chore/multi-agent-workflow`.
- Rama de cierre: `docs/phase-2-closeout`.
- Baseline inicial: `e4fa128` (HEAD de main al iniciar Fase 2).
- Baseline de cierre: `d9c0e0a` (HEAD de main tras merge de Checkpoint 2.5).
- Baseline final: `d3150a4` (merge commit de PR #11).
- Working tree principal: `D:\Pedro\AGROBO` (escritor: Kiro).
- Worktree de auditoria: `D:\Pedro\AGROBO-audit` (solo lectura: Antigravity).

## 3. Autoridad por materia

La autoridad se resuelve por materia, no por cadena lineal unica:

| Materia | Fuente autoritativa |
| --- | --- |
| Alcance y horizontes (CURRENT/P0/P1/P2) | `docs/product/product-scope-v2.md` |
| Decisiones arquitectonicas | ADRs vigentes (Accepted, no Superseded) |
| Estado real CURRENT | Codigo, tests, CI y `docs/product/capability-status-matrix.md` |
| Trabajo autorizado | Spec activa aprobada + checkpoint/runbook activo |
| Reglas permanentes del agente | Steering (`.kiro/steering/`) y AGENTS.md (raiz y locales, existentes) |
| Reglas locales por directorio | AGENTS.md mas especifico (existente por directorio) |
| Prompt de tarea | Puede restringir o acotar, nunca contradecir fuentes superiores |

### Jerarquia general (cuando las materias se solapan)

1. `docs/product/product-scope-v2.md`
2. ADRs vigentes
3. Codigo, tests y CI (evidencia de CURRENT)
4. Spec activa aprobada y runbook activo
5. Steering
6. Documentos de arquitectura y producto derivados
7. README y demo

### Resolucion de contradicciones

1. Identificar la materia.
2. Determinar fuente autoritativa (tabla anterior).
3. Si afecta alcance, seguridad o arquitectura → STOP REQUIRED.
4. Si es mecanica/derivada → corregir documento inferior dentro de allowlist.
5. Si requiere modificar fuente superior → STOP REQUIRED.
6. Registrar en handoff report.

## 4. Topologia de agentes

| Agente | Working tree | Modo | Rama |
| --- | --- | --- | --- |
| Kiro | D:\Pedro\AGROBO | Escritor unico | chore/multi-agent-workflow |
| Antigravity | D:\Pedro\AGROBO-audit | Solo lectura | detached HEAD |
| Codex (futuro) | D:\Pedro\AGROBO-codex | Escritor delegado | rama propia |
| Copilot | (inline) | Sugerencias + PR review | n/a |
| Lovable/Replit | (aislado) | Prototipo sin DB/Auth/Cloud | n/a |
| Gemini/ChatGPT | (externo) | Advisory solo | n/a |
| Humano | D:\Pedro\AGROBO | Autoridad final | cualquiera |

### Regla fundamental

**Un solo escritor activo por working tree en todo momento.**

## 5. Preflight obligatorio

Antes de cualquier escritura, el agente activo ejecuta:

```powershell
git branch --show-current
git status --short
git status -sb
git log -5 --oneline --decorate
git diff --check
git worktree list
```

### Condiciones de fallo

| Condicion | Accion |
| --- | --- |
| Rama distinta a la esperada | STOP REQUIRED |
| Archivos no reconocidos en working tree | STOP REQUIRED |
| HEAD no coincide con el esperado | STOP REQUIRED |
| Errores de whitespace | Corregir si en allowlist; STOP si fuera |

## 6. Clasificacion de comandos

### 6.1 Automaticamente seguros

```text
git status, git log, git diff, git branch (list/show), git remote
git worktree list, git show, git rev-parse, git grep
npm run format (check), npm run lint, npm run typecheck
npm test, npm run test:memstorage, npm run test:integration
npm run build, npm run check:encoding, npm run db:check
Lectura de archivos, busquedas (grep, file_search, read_file)
```

### 6.2 Requieren autorizacion humana

```text
git commit, git push, git branch (crear/renombrar), git tag, git stash
git checkout/switch (cambio de rama)
git worktree add
gh pr create
npm install, npm ci
Cambios a package.json o package-lock.json
Creacion de archivos fuera de allowlist
```

### 6.3 Requieren tarea de schema/DB expresamente aprobada

```text
drizzle-kit generate
npm run db:migrate
npm run db:seed
```

No son automaticamente seguros. Solo dentro de una tarea cuya allowlist incluya
trabajo de migracion o seed.

### 6.4 Requieren autorizacion cloud explicita (no permitidos en Fase 2)

```text
cdk bootstrap, cdk synth, cdk diff
aws [cualquier comando de escritura]
```

`aws sts get-caller-identity` no es parte del preflight rutinario; solo en
tareas que expresamente requieran verificacion de identidad cloud.

### 6.5 Prohibidos sin excepcion

```text
git push --force, git reset --hard, git clean -fd
git branch -D, git rebase -i
git merge (por agente; solo humano o delegacion humana explicita)
cdk deploy, cdk destroy
aws [create|delete|update|put|invoke]
rm -rf [directorio del proyecto]
DROP TABLE, ALTER TABLE (fuera de migraciones expresamente autorizadas)
Modificacion de .git/config
```

## 7. Allowlists por checkpoint

### Checkpoint 2.1 — Spec y runbook

| Tipo | Archivos |
| --- | --- |
| Crear | `.kiro/specs/multi-agent-workflow/requirements.md` |
| Crear | `.kiro/specs/multi-agent-workflow/design.md` |
| Crear | `.kiro/specs/multi-agent-workflow/tasks.md` |
| Crear | `docs/roadmap/phase-2-execution-runbook.md` |
| Modificar | Ninguno |
| Prohibido | api/src, web/src, shared, infra/src, migrations, package.json |

### Checkpoint 2.2 — Alineacion documental (posterior a aprobacion de 2.1)

| Tipo | Archivos |
| --- | --- |
| Crear | Ninguno |
| Modificar | `docs/spec-map.md`, `docs/kiro/development-process.md` |
| Prohibido | api/src, web/src, shared, infra/src, migrations, package.json, Steering |

## 8. Quality gates

| Gate | Comando | Criterio |
| --- | --- | --- |
| Format | `npm run format` | Exit 0 |
| Encoding | `npm run check:encoding` | Exit 0 |
| Lint | `npm run lint` | 0 errores |
| Typecheck | `npm run typecheck` | Exit 0 |
| Unit tests | `npm test` | Todas pasan |
| Build | `npm run build` | Exit 0 |
| Whitespace | `git diff --check` | Sin errores |

### Politica de fallos

- Gate falla → STOP REQUIRED si no corregible dentro de allowlist.
- No desactivar reglas.
- No modificar archivos fuera de allowlist para arreglar un gate.
- No usar `--no-verify` para saltarse hooks.

## 9. Politica Git

| Accion | Politica |
| --- | --- |
| Commit | Solo con autorizacion humana; staging por nombre de archivo |
| Push | Solo a feature branch; nunca a main; solo con autorizacion |
| Branch (crear) | Solo con autorizacion humana |
| PR (crear) | Solo con autorizacion; titulo < 70 chars; descripcion estructurada |
| Merge / PR close | Solo humano o delegacion humana explicita por instancia |
| Rebase | Prohibido por agentes |
| Force push | Prohibido sin excepcion |
| Branch delete | Solo con autorizacion |

### Convencion de commits

```text
type(scope): description

Tipos: docs, chore, feat, fix, refactor, test, ci
Scope: multi-agent, spec-16, phase-2, governance
```

## 10. Formato de handoff

Al final de cada bloque, el agente produce:

```markdown
## Handoff Report — [Checkpoint]

- **Fecha**: YYYY-MM-DD
- **Agente**: [nombre]
- **Rama**: [branch]
- **HEAD**: [hash]
- **Estado**: [completado|parcial|bloqueado]

### Archivos inspeccionados
### Archivos creados
### Archivos modificados
### Decisiones aplicadas
### Validaciones
### Ambiguedades
### Git status
### Confirmacion
- No commit sin autorizacion
- No push sin autorizacion
- No merge sin autorizacion
- No deploy

### Condicion de parada
```

## 11. STOP REQUIRED — Condiciones

El agente aplica STOP REQUIRED inmediatamente cuando:

- Un quality gate falla y no es corregible dentro de la allowlist.
- Aparece un archivo no autorizado en el working tree.
- La rama o HEAD no coincide con lo esperado.
- Se detecta contradiccion de alcance, seguridad o arquitectura.
- Se necesita una decision humana.
- Se requiere codigo, schema o dependencias.
- Se detecta un secreto en archivos staged.
- Se necesita commit, push, PR, merge o deploy.
- Un agente intenta escribir fuera de su ownership.

## 12. Revision de PR

1. Kiro prepara el plan de commits y descripcion del PR.
2. Humano autoriza y ejecuta commit + push.
3. Antigravity produce revision estructurada en el worktree de auditoria.
4. Copilot puede agregar comentarios inline.
5. Humano revisa, aprueba y merge.
6. Ningun agente puede hacer merge.

## 13. Ownership de archivos

### Principios

- Cada tarea declara ownership explicito.
- Dos agentes no pueden tener write-ownership sobre el mismo archivo.
- La transferencia requiere handoff + autorizacion humana + preflight del receptor.

### Ownership activo (Fase 2)

| Archivo/Patron | Owner |
| --- | --- |
| `.kiro/specs/multi-agent-workflow/*` | Kiro |
| `docs/roadmap/phase-2-execution-runbook.md` | Kiro |
| `docs/spec-map.md` (en Checkpoint 2.2) | Kiro |
| `docs/kiro/development-process.md` (en Checkpoint 2.2) | Kiro |
| Resto del repositorio | Sin escritor activo (protegido) |

## 14. Worktrees para escritura paralela

### Creacion (solo con autorizacion humana)

```powershell
git worktree add D:\Pedro\AGROBO-<agent> <branch-name>
```

### Reglas

- Rama dedicada por worktree.
- Ownership de archivos disjunto.
- Cada worktree tiene su propio preflight.
- Integracion solo via PR (humano merge).
- Conflictos resueltos solo por humano.
- Maximo 2 worktrees escritores simultaneos (+ auditoria read-only).
- **Este maximo es un limite de seguridad, no una autorizacion automatica.**
  Cada worktree adicional requiere aprobacion humana explicita.

### Archivos excluidos de escritura paralela

Los siguientes archivos nunca pueden tener dos owners simultaneos:

- `shared/schema.ts`
- `api/migrations/**`
- `package-lock.json`
- `docs/product/product-scope-v2.md`
- `docs/adr/**`
- `.kiro/specs/` (Spec activa en ejecucion)
- `.github/workflows/**`

## 15. Auditorias de solo lectura

- Antigravity en `D:\Pedro\AGROBO-audit` (detached HEAD).
- Puede leer cualquier archivo.
- Puede ejecutar cualquier comando de solo lectura.
- Produce reportes de revision (via chat o documento externo).
- No escribe al repositorio.
- No tiene restriccion de allowlist (es solo lectura).

## 16. Limites de gobernanza

| Dimension | Limite | Revision |
| --- | --- | --- |
| Configs de agente Kiro | 4 max | Al cerrar cada fase |
| Skills | 5 max | Al cerrar cada fase |
| MCP servers nuevos | 0 | Hasta nueva Spec |
| Worktrees escritores | 2 max | Al cerrar cada fase |
| Steering duplicado en AGENTS.md | 0 | Permanente |

Documentos extensos de gobernanza residen en `docs/agents/` (cuando se creen).
Adaptadores cortos por herramienta referencian a la Spec y al runbook.

## 17. Bloques operativos

### Bloque A — Spec y runbook (Checkpoint 2.1)

| Tarea | Descripcion |
| --- | --- |
| T01 | Crear Spec (requirements + design + tasks) |
| T02 | Crear phase-2-execution-runbook |
| T03 | Ejecutar quality gates |
| T04 | Producir handoff report + STOP REQUIRED |

Puerta humana al final de T04.

### Bloque B — Alineacion documental (Checkpoint 2.2)

| Tarea | Descripcion |
| --- | --- |
| T05 | Actualizar spec-map.md |
| T06 | Actualizar development-process.md |
| T07 | Quality gates finales + auditoria de consistencia |
| T08 | Plan de commits + handoff final + STOP REQUIRED |

Puerta humana al final de T08.

### Bloque C — Hallazgos Antigravity (Checkpoint 2.3)

| Tarea | Descripcion |
| --- | --- |
| T09 | Hacer portables las rutas absolutas en hooks |
| T10 | Verificar sintaxis de frontmatter de Steering |
| T11 | Actualizar ADR 011 como Superseded |
| T12 | Confirmar farm-assistant-plan.md y enlaces Steering (solo lectura) |

Puerta humana al final de T12.

### Bloque D — Gobernanza operativa (Checkpoint 2.4)

| Tarea | Descripcion |
| --- | --- |
| T13 | Crear AGENTS.md raiz y locales justificados |
| T14 | Crear docs/agents/, copilot-instructions, CLAUDE.md, GEMINI.md |
| T15 | Crear configuracion Kiro (4 agents + 5 skills) |

Puerta humana al final de T15.

### Bloque E — Simulacion y cierre (Checkpoint 2.6) — COMPLETADO

| Tarea | Descripcion |
| --- | --- |
| T16 | Simulacion multiagente, auditoria, CI, cierre — COMPLETADA (PR #11 merged) |

Puerta humana al final de T16 — aprobada.

## 18. Evidencia runtime del Checkpoint 2.6

Simulacion ejecutada en Kiro IDE con perfiles reales de custom agents:

| Perfil | Skill | Prueba principal | Resultado |
| --- | --- | --- | --- |
| planner | repo-preflight | preflight con allowlist vacia | PASS |
| implementer | quality-gates | gates seguros sin escritura | PASS |
| aws-architect | aws-change-plan | plan-only, 0 cloud | PASS |
| reviewer | pr-audit | merge-base permitido y git add bloqueado | PASS |

Skill adicional verificada: **task-handoff** (reconocida y usada para producir
el handoff de la simulacion).

Resultado agregado:

- 4 custom agents verificados en perfiles reales.
- 5 workspace skills reconocidas.
- deny runtime confirmado (git add -n AGENTS.md bloqueado).
- git merge-base permitido como comando seguro.
- 0 archivos modificados durante la simulacion.
- 0 MCP nuevos.
- 0 recursos AWS.
- 0 commit, push, PR, merge, deploy.

## 19. Definition of Done — Fase 2

- [x] Spec 16 (Requirements + Design + Tasks) completa y coherente.
- [x] Phase-2-execution-runbook completo y coherente.
- [x] spec-map.md actualizado.
- [x] development-process.md actualizado.
- [x] Hallazgos Antigravity resueltos (T09–T12).
- [x] AGENTS.md raiz y locales creados (T13).
- [x] Documentacion en docs/agents/ y adaptadores creados (T14).
- [x] Configuracion Kiro (4 agents + 5 skills) creada y verificada (T15).
- [x] Simulacion multiagente exitosa (T16 — runtime PASS).
- [x] Quality gates verdes (quality-gates CI SUCCESS, PR #11).
- [x] Auditoria independiente completada (Antigravity PASS, PR #11).
- [x] CI remoto verde (quality-gates + integration-postgres SUCCESS, PR #11).
- [x] Cero contradicciones con product-scope-v2 o ADRs.
- [x] Ningun codigo funcional modificado.
- [x] Ninguna dependencia instalada.
- [x] Cero MCP nuevos.
- [x] Cero recursos AWS creados.
- [x] Ningun commit, push, PR, merge o deploy sin autorizacion humana.
- [x] Modelo de gobernanza minimo y no-bloqueante para Specs 17+.
- [x] Handoff final producido.

## 20. Resultado final de Fase 2

- 4 custom agents configurados y verificados en runtime.
- 5 workspace skills configuradas y verificadas en runtime.
- 0 MCP nuevos.
- Simulacion runtime: PASS.
- Auditoria independiente (Antigravity): PASS.
- CI remoto: quality-gates SUCCESS, integration-postgres SUCCESS.
- PR #11 merged (2026-07-27T03:45:30Z), merge commit d3150a4.
- 0 codigo funcional modificado.
- 0 dependencias instaladas.
- 0 migraciones ejecutadas.
- 0 recursos AWS creados.

## 21. Trabajo expresamente excluido

### Restricciones permanentes de Fase 2

Queda prohibido durante **toda** la Fase 2:

- Modificar codigo funcional de api/src, web/src, shared/ o infra/src.
- Modificar schema o migraciones (`api/migrations/`).
- Modificar bases de datos (DDL, seeds no autorizados).
- Instalar o cambiar dependencias (`package.json`, `package-lock.json`).
- Desplegar o crear recursos cloud (AWS).
- Crear MCP servers nuevos.
- Implementar capacidades P0 o P1.
- Activar trabajo P2.

Estas restricciones son independientes de REQ-NEG03 (restriccion temporal sobre
archivos de gobernanza) y aplican incondicionalmente a toda la Fase 2.

### Restricciones temporales (solo Checkpoints 2.1, 2.1A y 2.1B)

Queda prohibido unicamente durante estos checkpoints iniciales:

- Crear AGENTS.md (raiz o locales).
- Crear CLAUDE.md, GEMINI.md, `.github/copilot-instructions.md`.
- Crear `.kiro/agents/` o `.kiro/skills/`.
- Crear hooks nuevos o modificar hooks existentes.

Estos archivos son entregables planificados de checkpoints posteriores de Fase 2
(T13–T15) con allowlist y aprobacion humana explicitas.

## 22. Reanudacion entre sesiones

1. Leer este runbook.
2. Leer el ultimo handoff disponible.
3. Ejecutar preflight completo.
4. Verificar que estado coincide con el handoff.
5. Identificar el checkpoint y tarea activos.
6. Continuar dentro del bloque autorizado.
7. Detenerse en la puerta humana o ante STOP REQUIRED.

## 23. Regla final

Este runbook autoriza procedimiento, no autonomia.

Kiro continua dentro de un bloque cuando el trabajo sea documental, mecanico,
respaldado y corregible localmente.

Kiro se detiene cuando continuar pueda propagar una decision incorrecta, afectar
codigo, ocultar un fallo o producir un costo alto de correccion.

```text
STOP REQUIRED — se necesita decision humana antes de continuar.
```
