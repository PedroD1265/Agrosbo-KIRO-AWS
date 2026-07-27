# Documentation Drift Report — Spec 17

## Propósito

Identifica contradicciones, referencias obsoletas e inconsistencias detectadas durante
el análisis de los documentos canónicos de la Fase 3. Los documentos fuente NO se
modifican en este paquete; los drifts se documentan aquí para que Kiro los corrija en T18.

Fuente: análisis de lectura de `.kiro/specs/critical-cloud-spikes/` y
`docs/roadmap/phase-3-execution-runbook.md` durante la preparación del paquete de Fase 3.

---

## DRIFT-001 — Puerto de PostgreSQL en design.md vs implementación real

| Campo | Detalle |
|---|---|
| **Archivo** | `.kiro/specs/critical-cloud-spikes/design.md` |
| **Sección** | §7.2 (Flujo del harness S4, pasos 8 y 9) y §7.3 (Dependencias) |
| **Contradicción** | design.md §7.2 paso 8: *"Usar la instancia local de PostgreSQL (agrosbo-local-db, puerto 54321)"*. design.md §7.3: *"PostgreSQL local (agrosbo-local-db en puerto 54321)"*. La implementación real en `pg-concurrency.ts` y `README.md` usa un **contenedor dedicado `agrosbo-spike-token-db` en el puerto 54322**, base de datos `agrosbo_spike_token`. |
| **Impacto** | ALTO — un operador que siga el diseño al pie de la letra conectaría al puerto 54321 (base de datos de desarrollo de la aplicación) en lugar del contenedor del spike. Esto podría corromper la DB de desarrollo o hacer que los tests fallen inesperadamente. |
| **Corrección propuesta** | En design.md §7.2 paso 8 y §7.3, reemplazar: *"agrosbo-local-db en puerto 54321"* → *"contenedor dedicado `agrosbo-spike-token-db` en el puerto 54322, base de datos `agrosbo_spike_token` (NO usar `agrosbo-local-db` en 54321)"* |
| **Prioridad** | ALTA |
| **Acción en T18** | Kiro corrige design.md (si está en allowlist de T18) o documenta en summary.md |

---

## DRIFT-002 — Estado de tareas en tasks.md desactualizado

| Campo | Detalle |
|---|---|
| **Archivo** | `.kiro/specs/critical-cloud-spikes/tasks.md` |
| **Sección** | §7 Estado actual |
| **Contradicción** | tasks.md §7 muestra: *"T01–T03: COMPLETED — AWAITING HUMAN APPROVAL; T04–T19: PLANNED"*. El estado real del proyecto es: T04 PASS, T05 PASS, T06 PASS (21/21), T07 COMPLETED (merged PR #16), T08 COMPLETED (merged PR #17), T09 COMPLETED (merged PR #19). T10–T12: PENDING. |
| **Impacto** | MEDIO — operadores que lean tasks.md para orientarse verán un estado incorrecto. Puede causar confusión sobre qué tareas ya están completas y cuáles son realmente PLANNED. |
| **Corrección propuesta** | Actualizar tasks.md §7 para reflejar el estado real de T01–T09 y T13. |
| **Prioridad** | MEDIA |
| **Acción en T18** | Kiro actualiza tasks.md §7 en T18 (allowlist de T18 incluye `.kiro/` — verificar) |

---

## DRIFT-003 — REQ-IAM-04 vs design.md §3.2: ambigüedad sobre uso de AgrosboDeveloperRole

| Campo | Detalle |
|---|---|
| **Archivo 1** | `.kiro/specs/critical-cloud-spikes/requirements.md` |
| **Sección 1** | §8, REQ-IAM-04 |
| **Archivo 2** | `.kiro/specs/critical-cloud-spikes/design.md` |
| **Sección 2** | §3.2 |
| **Contradicción** | REQ-IAM-04: *"THE SYSTEM SHALL NOT use the AgrosboDeveloperRole (ReadOnlyAccess) for spike execution."* Design.md §3.2: *"Se requiere un rol temporal de spike (o una política inline temporal adjunta al rol existente)."* The actual implementation (T05 PASS) attaches AgrosboSpikeTemporaryPolicy to AgrosboDeveloperRole, making the role no longer "just ReadOnlyAccess" but instead ReadOnlyAccess + spike permissions. This satisfies the intent (not executing with only ReadOnly) but the terminology in REQ-IAM-04 may confuse readers. |
| **Impacto** | BAJO (la intención es clara — el estado T05 PASS indica que se resolvió con una policy temporal; la ambigüedad es solo documental). Sin embargo, puede causar confusión en futuras Specs que referencien este diseño. |
| **Corrección propuesta** | Clarificar design.md §3.2: *"Se requiere un rol temporal de spike separado (no AgrosboDeveloperRole); o si se adjunta una política temporal al AgrosboDeveloperRole, documentar que el rol resultante no es el mismo que el ReadOnlyAccess original."* Alternativamente, alinear con la solución real implementada en T05. |
| **Prioridad** | BAJA |
| **Acción en T18** | Documentar en summary.md; corrección en design.md opcional |

---

## DRIFT-004 — Referencias a SES → SNS (búsqueda en archivos no leídos)

| Campo | Detalle |
|---|---|
| **Archivos verificados en este análisis** | `.kiro/specs/critical-cloud-spikes/requirements.md`, `design.md`, `tasks.md`, `docs/roadmap/phase-3-execution-runbook.md` |
| **Estado** | En los archivos leídos, la arquitectura es consistentemente **SES → EventBridge → SQS** (actual). No se detectaron referencias a SES → SNS en estos documentos. |
| **Riesgo residual** | Pueden existir referencias a SES → SNS en documentos no leídos durante este análisis (ej. `docs/architecture/aws-service-plan.md`, `docs/spec-map.md`, ADRs, `product-scope-v2`, `AGENTS.md`). |
| **Impacto si existe** | MEDIO — un documento que todavía muestre SES → SNS puede confundir al operador que ejecute T12. |
| **Corrección propuesta** | Ejecutar: `git grep -r "SES.*SNS\|SNS.*SES\|Simple Notification" docs/ .kiro/ --include="*.md"` para identificar archivos específicos y actualizarlos. |
| **Prioridad** | MEDIA (verificar antes de T12) |
| **Acción en T18** | Kiro ejecuta el grep, identifica archivos afectados, y corrige en allowlist de T18 |

---

## DRIFT-005 — runbook §2: rama de kickoff desactualizada

| Campo | Detalle |
|---|---|
| **Archivo** | `docs/roadmap/phase-3-execution-runbook.md` |
| **Sección** | §2 Prerrequisitos |
| **Contradicción** | runbook §2: *"Rama de kickoff: `docs/spec-17-kickoff`"* y *"Baseline: `bfedd57`"*. La rama activa es `replit/spec-17-cloud-prep` y el HEAD actual es `44da638`. |
| **Impacto** | BAJO — la rama y el HEAD mencionados son los del kickoff documental (Checkpoint 3.1), ya completado. El runbook §5 documenta checkpoints posteriores; la sección §2 es histórica. Sin embargo, un lector nuevo puede confundirse sobre cuál es la rama activa. |
| **Corrección propuesta** | Agregar una nota en runbook §2: *"Nota: esta rama fue para el kickoff documental (Checkpoint 3.1). La rama activa para Checkpoints 3.2–3.7 es `replit/spec-17-cloud-prep` desde HEAD `44da638`."* |
| **Prioridad** | BAJA |
| **Acción en T18** | Agregar nota en runbook si está en allowlist; si no, documentar en summary.md |

---

## DRIFT-006 — Criterios S4 en requirements.md vs implementación real (alcance de tests)

| Campo | Detalle |
|---|---|
| **Archivo** | `.kiro/specs/critical-cloud-spikes/requirements.md` |
| **Sección** | §9, criterios S4 |
| **Observación** | requirements.md §9 lista 10 criterios PASS/FAIL para S4. El harness implementado (`index.ts` + `token-service.ts`) cubre todos los criterios de Part A (8 criterios crypto/in-memory) y los 3 criterios de Part B (PostgreSQL). Sin embargo, el criterio *"Throughput (ops/min)"* mencionado en REQ-MET-01 está implementado como *ops/seg* en el harness (163,592 ops/seg confirmado). La unidad difiere pero la métrica es más granular en la implementación. |
| **Impacto** | MUY BAJO — la métrica reportada (ops/seg) es más precisa que la requerida (ops/min). Sin impacto funcional. |
| **Corrección propuesta** | Actualizar REQ-MET-01 en requirements.md: *"Throughput (ops/sec)"* en lugar de *"(ops/min)"*. |
| **Prioridad** | MUY BAJA |
| **Acción en T18** | Opcional — solo si Kiro considera necesario actualizar requirements.md |

---

## Resumen de drifts

| ID | Severidad | Archivo(s) afectado(s) | Estado |
|---|---|---|---|
| DRIFT-001 | ALTA | design.md §7.2, §7.3 | Pendiente corrección en T18 |
| DRIFT-002 | MEDIA | tasks.md §7 | Pendiente corrección en T18 |
| DRIFT-003 | BAJA | requirements.md REQ-IAM-04 + design.md §3.2 | Pendiente aclaración en T18 |
| DRIFT-004 | MEDIA | Archivos no verificados (buscar con grep) | Pendiente verificación en T18 |
| DRIFT-005 | BAJA | runbook.md §2 | Pendiente nota en T18 |
| DRIFT-006 | MUY BAJA | requirements.md REQ-MET-01 | Opcional en T18 |

**Instrucción para T18**: revisar esta tabla y aplicar correcciones en los archivos
que estén dentro de la allowlist de T18 (`docs/spec-map.md`,
`docs/roadmap/delivery-roadmap-v2.md`). Para archivos en `.kiro/`, verificar si el
allowlist de T18 incluye modificaciones a la Spec.
