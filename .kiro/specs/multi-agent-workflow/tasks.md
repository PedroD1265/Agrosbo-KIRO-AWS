# Tasks — multi-agent-workflow (Spec 16)

## 1. Introduccion

Tareas atomicas para materializar la gobernanza multiagente definida en
Requirements y Design. Cada tarea incluye checkpoint, allowlist, validaciones y
criterio de terminado. Ninguna tarea implementa codigo funcional ni capacidades
P0/P1.

## 2. Bloques de trabajo

| Bloque | Tareas | Puerta humana |
| --- | --- | --- |
| A | T01–T04 | Al final de T04 (Spec + runbook completos) |
| B | T05–T08 | Al final de T08 (alineacion documental) |
| C | T09–T12 | Al final de T12 (hallazgos Antigravity resueltos) |
| D | T13–T15 | Al final de T15 (gobernanza operativa materializada) |
| E | T16 | Al final de T16 (simulacion, auditoria y cierre) |

## 3. Tareas

---

### T01 — Crear Spec multi-agent-workflow (Requirements + Design + Tasks)

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.1 |
| Agente | Kiro |
| Dependencias | Spec 15 aprobada; Fase 1 completada |
| Requisitos cubiertos | Formalizacion documental de todos los requisitos (no implementacion operacional) |
| Allowlist (crear) | `.kiro/specs/multi-agent-workflow/requirements.md`, `.kiro/specs/multi-agent-workflow/design.md`, `.kiro/specs/multi-agent-workflow/tasks.md` |
| Allowlist (modificar) | Ninguno |
| Prohibido | api/src, web/src, shared, infra/src, migrations, package.json |
| Validaciones | `npm run check:encoding`, `git diff --check` |
| Criterio de terminado | Los tres archivos existen, son coherentes entre si y trazables a fuentes |
| Condicion de parada | STOP REQUIRED si se detecta contradiccion con product-scope-v2 o ADRs |
| Nota | T01 formaliza los requisitos como documentos. La implementacion operacional se realiza en T09–T16. |

---

### T02 — Crear phase-2-execution-runbook

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.1 |
| Agente | Kiro |
| Dependencias | T01 completada |
| Requisitos cubiertos | REQ-D01, REQ-E01, REQ-F01–F03, REQ-G01–G05, REQ-H01–H03, REQ-I01–I03, REQ-J01–J02, REQ-N01 |
| Allowlist (crear) | `docs/roadmap/phase-2-execution-runbook.md` |
| Allowlist (modificar) | Ninguno |
| Prohibido | api/src, web/src, shared, infra/src, migrations, package.json |
| Validaciones | `npm run check:encoding`, `git diff --check` |
| Criterio de terminado | Runbook completo, coherente con la Spec y con phase-0-execution-runbook como referencia de estructura |
| Condicion de parada | STOP REQUIRED si requiere modificar documentos fuera de allowlist |

---

### T03 — Ejecutar quality gates de Checkpoint 2.1

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.1 |
| Agente | Kiro |
| Dependencias | T01, T02 completadas |
| Requisitos cubiertos | REQ-I01–I03 |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | Ningun archivo (solo lectura + ejecucion de gates) |
| Prohibido | Todo el working tree |
| Validaciones | `npm run check:encoding`, `git diff --check`, `git diff --stat`, `git status --short` |
| Criterio de terminado | Todos los gates pasan; estado Git conocido y limpio (solo archivos nuevos esperados) |
| Condicion de parada | STOP REQUIRED ante cualquier fallo no corregible |

---

### T04 — Producir handoff report del Checkpoint 2.1

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.1 |
| Agente | Kiro |
| Dependencias | T03 completada |
| Requisitos cubiertos | REQ-H01–H03, REQ-J01–J02, REQ-N01 |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | Ninguno (output en chat) |
| Prohibido | Escritura al repo |
| Validaciones | Verificar formato de handoff conforme a Design §7 |
| Criterio de terminado | Handoff completo presentado; STOP REQUIRED declarado; no commit/push/PR |
| Condicion de parada | STOP REQUIRED — Esperando revision humana |

---

### T05 — Actualizar docs/spec-map.md (estado de Spec 16)

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.2 (posterior a aprobacion humana de 2.1) |
| Agente | Kiro |
| Dependencias | T04 aprobada por humano |
| Requisitos cubiertos | REQ-B01 |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | `docs/spec-map.md` |
| Prohibido | api/src, web/src, shared, infra/src, migrations, package.json |
| Validaciones | `npm run check:encoding`, `git diff --check` |
| Criterio de terminado | Spec 16 marcada como IN PROGRESS o COMPLETADA en spec-map |
| Condicion de parada | Solo ante contradiccion |

---

### T06 — Actualizar docs/kiro/development-process.md

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.2 |
| Agente | Kiro |
| Dependencias | T05 completada |
| Requisitos cubiertos | REQ-B01, REQ-L04 |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | `docs/kiro/development-process.md` |
| Prohibido | Steering, api/src, web/src, shared, infra/src |
| Validaciones | `npm run check:encoding`, `git diff --check` |
| Criterio de terminado | Seccion de Fase 2 y gobernanza multiagente documentada |
| Condicion de parada | Solo ante contradiccion con product-scope-v2 |

---

### T07 — Ejecutar quality gates finales y auditoria de consistencia

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.2 |
| Agente | Kiro |
| Dependencias | T06 completada |
| Requisitos cubiertos | REQ-I01–I03 |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | Correcciones mecanicas a archivos de T05–T06 si gates fallan |
| Prohibido | api/src, web/src, shared, infra/src, migrations, package.json |
| Validaciones | `npm run format`, `npm run check:encoding`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `git diff --check` |
| Criterio de terminado | Todos los gates PASS; cero contradicciones activas |
| Condicion de parada | STOP REQUIRED ante fallo no corregible |

---

### T08 — Plan de commits y handoff final de Fase 2

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.2 |
| Agente | Kiro |
| Dependencias | T07 completada |
| Requisitos cubiertos | REQ-G01–G05, REQ-H01–H03, REQ-K01–K03, REQ-N01 |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | Ninguno (output en chat) |
| Prohibido | git commit, git push, git merge, escritura al repo |
| Validaciones | git status --short, git diff --stat |
| Criterio de terminado | Plan de commits propuesto (sin ejecutar); handoff final producido; STOP REQUIRED |
| Condicion de parada | STOP REQUIRED — Esperando autorizacion humana para commit y push |

---

## 4. Dependencias entre tareas

```text
T01 → T02 → T03 → T04 [PUERTA HUMANA]
T04 (aprobada) → T05 → T06 → T07 → T08 [PUERTA HUMANA]
T04 (aprobada) → T09, T10, T11, T12 [PUERTA HUMANA al final de T12]
T08 + T09 (aprobadas) → T13 → T14 → T15 [PUERTA HUMANA al final de T15]
T10 → T15 (prerequisito de sintaxis)
T15 + T11 + T12 → T16 [PUERTA HUMANA al final de T16]
```

Notas:
- T09–T12 pueden ejecutarse en paralelo con T05–T08 si sus allowlists no se
  solapan, o secuencialmente despues de T08.
- T13–T15 requieren que T08 y T09 esten aprobadas (hooks portables + alineacion
  documental completada).
- T16 es el cierre y requiere todo lo anterior completado.

## 5. Estado actual

| Tarea | Estado |
| --- | --- |
| T01 | Completada (Checkpoint 2.1) |
| T02 | Completada (Checkpoint 2.1) |
| T03 | Completada (Checkpoint 2.1) |
| T04 | Completada (Checkpoint 2.1) |
| T05 | Pendiente |
| T06 | Pendiente |
| T07 | Pendiente |
| T08 | Pendiente |
| T09 | Pendiente (Bloque C) |
| T10 | Pendiente (Bloque C) |
| T11 | Pendiente (Bloque C) |
| T12 | Pendiente (Bloque C, solo lectura/verificacion) |
| T13 | Pendiente (Bloque D) |
| T14 | Pendiente (Bloque D) |
| T15 | Pendiente (Bloque D) |
| T16 | Pendiente (Bloque E, cierre) |

## 6. Hallazgos de auditoria Antigravity (tareas futuras registradas)

Los siguientes hallazgos fueron reportados por la auditoria de solo lectura de
Antigravity. Se registran como tareas futuras dentro de Fase 2 (Bloque B o
posterior, segun corresponda).

---

### T09 — Hacer portables las rutas absolutas en hooks

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.2 o posterior |
| Agente | Kiro |
| Dependencias | T04 aprobada por humano |
| Requisitos cubiertos | REQ-A02 (worktree portability) |
| Hallazgo | Cinco hooks en `.kiro/hooks/` contienen rutas absolutas `D:/Pedro/AGROBO`. Esto impide la simulacion multi-worktree y portabilidad. |
| Allowlist (modificar) | `.kiro/hooks/compile-check.json`, `.kiro/hooks/format-check.json`, `.kiro/hooks/lint-check.json`, `.kiro/hooks/typecheck.json`, `.kiro/hooks/secret-scan.json` |
| Prohibido | api/src, web/src, shared, infra/src |
| Validaciones | Hooks ejecutan correctamente tras el cambio; `npm run check:encoding`, `git diff --check` |
| Criterio de terminado | Hooks usan rutas relativas o variable de entorno; ejecutan correctamente en ambos worktrees |
| Condicion de parada | STOP REQUIRED si el cambio rompe ejecucion de hooks |
| Nota | Debe hacerse ANTES de la simulacion multi-worktree |

---

### T10 — Verificar sintaxis de frontmatter de inclusion en Steering

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.2 o posterior |
| Agente | Kiro |
| Dependencias | T04 aprobada por humano |
| Requisitos cubiertos | REQ-B01 (autoridad por materia) |
| Hallazgo | Los ocho archivos en `.kiro/steering/` no tienen frontmatter de inclusion (`inclusion: auto`, `inclusion: manual`, etc.). Debe verificarse la sintaxis oficial vigente de Kiro antes de implementar cambios. |
| Allowlist (modificar) | Ninguno inicialmente (investigacion); potencialmente `.kiro/steering/*.md` tras verificacion |
| Prohibido | api/src, web/src, shared, infra/src |
| Validaciones | Verificar documentacion oficial de Kiro para sintaxis de frontmatter; `npm run check:encoding` |
| Criterio de terminado | Investigacion completada; decision documentada sobre si agregar frontmatter o dejarlo como esta |
| Condicion de parada | STOP REQUIRED si la sintaxis oficial no esta clara o requiere cambios no triviales |
| Nota | No modificar Steering sin verificar la sintaxis oficial vigente |

---

### T11 — Actualizar ADR 011 como Superseded by ADR 016

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.2 o posterior |
| Agente | Kiro |
| Dependencias | T04 aprobada por humano |
| Requisitos cubiertos | REQ-B01 (autoridad por materia) |
| Hallazgo | ADR 011 (Amplify Hosting) todavia muestra Estado: Accepted aunque ADR 016 (S3+CloudFront+OAC) lo reemplaza. Debe actualizarse como "Superseded by ADR 016" conservando el contenido historico. |
| Allowlist (modificar) | `docs/adr/011-amplify-hosting-for-pwa.md` |
| Prohibido | api/src, web/src, shared, infra/src, contenido del ADR (solo cambiar status) |
| Validaciones | `npm run check:encoding`, `git diff --check` |
| Criterio de terminado | ADR 011 muestra "Status: Superseded by ADR 016"; contenido historico conservado |
| Condicion de parada | Solo ante contradiccion |

---

### T12 — Verificar supersesion y enlaces documentales (solo lectura)

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.2 o posterior |
| Agente | Kiro |
| Dependencias | T04 aprobada por humano |
| Requisitos cubiertos | REQ-B01 |
| Objetivo | Verificar (sin modificar) que la documentacion historica y los enlaces internos estan en estado correcto |
| Verificacion D | `docs/architecture/farm-assistant-plan.md` ya esta correctamente marcado SUPERSEDED. Confirmar que no requiere cambio. NO modificar este archivo. |
| Verificacion E | Las rutas `../../docs/...` dentro de `.kiro/steering/` parecen correctas. Confirmar ejecutando comprobacion de enlaces. NO cambiar Steering salvo que un enlace este demostrado como roto. |
| Allowlist (modificar) | Ninguno (tarea de solo lectura y verificacion) |
| Prohibido | Modificar `docs/architecture/farm-assistant-plan.md`; modificar `.kiro/steering/`; modificar cualquier archivo sin evidencia de error |
| Validaciones | Comprobacion de enlaces relativos (lectura); reporte de resultados |
| Criterio de terminado | Confirmacion documentada en handoff de que: (1) farm-assistant-plan.md esta correctamente SUPERSEDED y no requiere cambio, (2) los enlaces de Steering resuelven correctamente o se identifican los rotos |
| Condicion de parada | STOP REQUIRED solo si se detectan enlaces rotos que requieran modificar archivos fuera de allowlist |
| Nota | Esta tarea NO genera modificaciones. Si se detecta un enlace roto, se reporta y se solicita autorizacion con allowlist especifica para corregirlo. |

---

### T13 — Gobernanza raiz y local (AGENTS.md)

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.3 (posterior a aprobacion de Bloque B/C) |
| Agente | Kiro |
| Dependencias | T08 completada y aprobada; T09 completada (hooks portables) |
| Requisitos cubiertos | REQ-L04, REQ-C08, REQ-C09 |
| Allowlist (crear) | `AGENTS.md`, `api/AGENTS.md`, `web/AGENTS.md`, `shared/AGENTS.md`, `infra/AGENTS.md`, `docs/AGENTS.md` |
| Allowlist (modificar) | Ninguno |
| Prohibido | api/src, web/src, shared (codigo), infra/src, migrations, package.json, Steering, ADRs |
| Validaciones | `npm run check:encoding`, `git diff --check`; verificar que no duplica product-scope-v2, ADRs ni Steering |
| Criterio de terminado | AGENTS.md raiz y locales justificados existen; son breves; dirigen a fuentes canonicas; no duplican contrato de producto, ADRs o Steering |
| Condicion de parada | STOP REQUIRED si un AGENTS.md local no esta justificado o excede el criterio de brevedad |
| Nota | Solo crear los AGENTS.md locales que aporten valor real. No crear por inercia. |

---

### T14 — Documentacion y adaptadores

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.3 |
| Agente | Kiro |
| Dependencias | T13 completada |
| Requisitos cubiertos | REQ-L04, REQ-B04 |
| Allowlist (crear) | `docs/agents/` (contenido minimo canonico), `.github/copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md` |
| Allowlist (modificar) | Ninguno |
| Prohibido | api/src, web/src, shared (codigo), infra/src, migrations, package.json, Steering |
| Validaciones | `npm run check:encoding`, `git diff --check`; verificar que adaptadores dirigen a fuentes canonicas sin convertirse en nuevas fuentes de verdad |
| Criterio de terminado | docs/agents/ con documentacion canonica minima; adaptadores breves creados; todos referencian a Spec 16, runbook y Steering sin duplicarlos |
| Condicion de parada | STOP REQUIRED si un adaptador excede la brevedad o introduce nueva fuente de verdad |

---

### T15 — Configuracion minima de Kiro (agents + skills)

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.3 |
| Agente | Kiro |
| Dependencias | T14 completada; T10 completada (verificacion de sintaxis Kiro) |
| Requisitos cubiertos | REQ-L01, REQ-L02, REQ-L03 |
| Allowlist (crear) | `.kiro/agents/planner.md`, `.kiro/agents/implementer.md`, `.kiro/agents/aws-architect.md`, `.kiro/agents/reviewer.md`, `.kiro/skills/repo-preflight.md`, `.kiro/skills/quality-gates.md`, `.kiro/skills/task-handoff.md`, `.kiro/skills/pr-audit.md`, `.kiro/skills/aws-change-plan.md` |
| Allowlist (modificar) | Ninguno |
| Prohibido | api/src, web/src, shared (codigo), infra/src, migrations, package.json, crear MCP nuevos |
| Validaciones | `npm run check:encoding`, `git diff --check`; verificar sintaxis oficial vigente de Kiro para agents/skills; max 4 agents y max 5 skills |
| Criterio de terminado | 4 configuraciones de agentes y 5 skills creadas; sintaxis verificada contra documentacion oficial; 0 MCP nuevos |
| Condicion de parada | STOP REQUIRED si la sintaxis oficial no esta clara o si se exceden los limites (4 agents / 5 skills / 0 MCP) |
| Nota | Verificar la documentacion oficial de Kiro antes de implementar. No crear MCP nuevos. |

---

### T16 — Simulacion, auditoria y cierre de Fase 2

| Campo | Valor |
| --- | --- |
| Checkpoint | 2.4 (cierre) |
| Agente | Kiro |
| Dependencias | T15 completada; T11 completada; T12 completada |
| Requisitos cubiertos | REQ-A01–A05, REQ-D01–D02, REQ-H01–H03, REQ-I01–I03, REQ-K01–K03, REQ-N01 |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | Correcciones mecanicas dentro de archivos ya creados en la Fase 2 si gates fallan |
| Prohibido | api/src, web/src, shared (codigo), infra/src, migrations, package.json, crear recursos AWS, implementar P0/P1 |
| Validaciones | Simulacion controlada de operacion multiagente: verificar separacion de worktrees, ownership, allowlists, handoff y STOP REQUIRED; ejecutar quality gates completos (`npm run format`, `npm run check:encoding`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`); solicitar auditoria independiente (Antigravity); verificar CI remoto tras push autorizado |
| Criterio de terminado | Simulacion exitosa documentada; quality gates verdes; auditoria independiente completada; CI remoto verde; plan de commit/push/PR final propuesto; STOP REQUIRED para cierre |
| Condicion de parada | STOP REQUIRED — Esperando autorizacion humana para commit final, push y PR de Fase 2 |

## 7. Definition of Done de Spec 16

- [ ] Requirements, Design y Tasks coherentes y trazables.
- [ ] Phase-2-execution-runbook completo.
- [ ] spec-map.md actualizado.
- [ ] development-process.md actualizado.
- [ ] Hallazgos de Antigravity registrados y resueltos (T09–T12).
- [ ] AGENTS.md raiz y locales creados (T13).
- [ ] Documentacion en docs/agents/ y adaptadores creados (T14).
- [ ] Configuracion Kiro (4 agents + 5 skills) creada y verificada (T15).
- [ ] Simulacion multiagente exitosa (T16).
- [ ] Quality gates verdes.
- [ ] Auditoria independiente completada.
- [ ] CI remoto verde.
- [ ] Cero contradicciones con product-scope-v2 o ADRs.
- [ ] Ningun codigo funcional modificado.
- [ ] Ninguna dependencia instalada.
- [ ] Cero MCP nuevos.
- [ ] Cero recursos AWS creados.
- [ ] Ningun commit, push, PR, merge o deploy sin autorizacion humana.
- [ ] Modelo de gobernanza minimo y no-bloqueante para Specs 17+.

## 8. Trazabilidad Tasks → Requirements

### Clasificacion de requisitos

Los requisitos se clasifican en tres categorias para efectos de trazabilidad:

1. **Implementados por tarea**: una tarea concreta materializa el requisito.
2. **Verificados por tarea**: una tarea concreta valida que el requisito se
   cumple.
3. **Restriccion transversal**: el requisito aplica a todas las tareas como
   condicion permanente; no necesita una tarea dedicada sino que se verifica en
   cada checkpoint.

### Requisitos transversales (aplican a todas las tareas)

| Requisito | Descripcion |
| --- | --- |
| REQ-A01 | Un solo escritor por working tree |
| REQ-A03 | No dos agentes en el mismo archivo |
| REQ-C08 | Implementer solo escribe en allowlist aprobada |
| REQ-C09 | No auth simultanea sobre api+web+shared+infra |
| REQ-D01–D02 | Preflight obligatorio |
| REQ-E01–E03 | Allowlists por tarea |
| REQ-F01 | Comandos automaticamente seguros |
| REQ-G02 | Staging por nombre de archivo |
| REQ-G03 | Commits convencionales |
| REQ-H02 | Handoff confirma no commit/push/deploy |
| REQ-I02 | No desactivar reglas ante fallo |
| REQ-J01–J02 | STOP REQUIRED ante condiciones definidas |
| REQ-M01–M02 | Ownership exclusivo declarado por tarea |
| REQ-NEG01 | No comandos destructivos sin auth |
| REQ-NEG02 | Gobernanza no bloquea P0 |
| REQ-NEG04 | No instalar dependencias |
| REQ-NEG05 | No modificar codigo funcional |
| REQ-NEG06 | Restriccion funcional independiente: 0 P0/P1, 0 code, 0 migrations, 0 deps, 0 MCP, 0 AWS |

### Matriz Tasks → Requirements (implementacion y verificacion)

| Tarea | Rol | Requirements cubiertos |
| --- | --- | --- |
| T01 | Formaliza | Documenta todos los requisitos (formalizacion de la Spec, no implementacion operacional) |
| T02 | Implementa | REQ-D01 (preflight en runbook), REQ-E01 (allowlists en runbook), REQ-F01–F07 (clasificacion en runbook), REQ-G01–G05 (politica Git en runbook), REQ-H01–H03 (handoff en runbook), REQ-I01–I03 (gates en runbook), REQ-J01–J02 (STOP en runbook) |
| T03 | Verifica | REQ-I01–I03 (ejecucion real de gates) |
| T04 | Verifica | REQ-H01–H03 (handoff producido), REQ-J01–J02 (STOP aplicado) |
| T05 | Implementa | REQ-B01 (spec-map refleja autoridad por materia) |
| T06 | Implementa | REQ-B01, REQ-L04 (development-process documentado sin duplicar Steering) |
| T07 | Verifica | REQ-I01–I03 (gates finales) |
| T08 | Verifica | REQ-G01–G05 (plan de commits), REQ-H01–H03 (handoff final), REQ-K01–K03 (revision de PR preparada) |
| T09 | Implementa | REQ-A02 (worktree portability via hooks portables) |
| T10 | Verifica | REQ-B01 (verificar sintaxis Steering es correcta) |
| T11 | Implementa | REQ-B01 (ADR 011 status correcto) |
| T12 | Verifica | REQ-B01 (confirmar supersesion y enlaces correctos) |
| T13 | Implementa | REQ-L04 (AGENTS.md breves sin duplicar Steering), REQ-C08 (restricciones documentadas por directorio) |
| T14 | Implementa | REQ-L04 (docs/agents/ canonica), REQ-B04 (adaptadores no contradicen fuentes superiores) |
| T15 | Implementa | REQ-L01 (4 agents), REQ-L02 (5 skills), REQ-L03 (0 MCP) |
| T16 | Verifica | REQ-A01–A05 (simulacion de concurrencia), REQ-D01–D02 (preflight real), REQ-H01–H03 (handoff real), REQ-I01–I03 (gates completos), REQ-K01–K03 (auditoria y revision), REQ-N01 (DoD completa) |

### Requisitos con restriccion temporal

| Requisito | Restriccion temporal | Tarea de implementacion posterior |
| --- | --- | --- |
| REQ-NEG03 | Prohibido en 2.1/2.1A/2.1B | T13, T14, T15 (implementan lo que NEG03 pospone) |
