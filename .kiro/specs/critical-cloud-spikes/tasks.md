# Tasks — critical-cloud-spikes (Spec 17)

## 1. Introduccion

Tareas atomicas para ejecutar los spikes criticos definidos en Requirements y
Design. Cada tarea incluye checkpoint, dependencias, responsable, allowlist,
comandos permitidos, evidencia, criterio de aceptacion y condiciones de parada.

La fase se divide en checkpoints secuenciales con puertas humanas. Dos tracks
tecnicos (S1+S2 y S3+S4) pueden ejecutarse en paralelo unicamente despues de
aprobar el Design y completar el preflight cloud.

## 2. Bloques de trabajo

| Bloque | Checkpoint | Tareas | Puerta humana |
|--------|-----------|--------|---------------|
| A | 3.1 | T01–T03 | Kickoff documental — aprobacion humana de Spec |
| B | 3.2 | T04–T05 | Preflight cloud — aprobacion de region y permisos |
| C | 3.3 | T06–T09 | Harnesses locales — estructura y codigo creados |
| D | 3.4 | T10–T13 | Ejecucion AWS — resultados obtenidos |
| E | 3.5 | T14–T15 | Evaluacion y microvalidaciones documentales |
| F | 3.6 | T16–T17 | Cleanup y verificacion |
| G | 3.7 | T18–T19 | Auditoria, alineacion documental y cierre |

## 3. Tareas

---

### T01 — Crear Spec critical-cloud-spikes (Requirements + Design + Tasks)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.1 |
| Agente | Kiro (planner) |
| Dependencias | Spec 16 completada; Fases 0–2 completadas |
| Allowlist (crear) | `.kiro/specs/critical-cloud-spikes/requirements.md`, `.kiro/specs/critical-cloud-spikes/design.md`, `.kiro/specs/critical-cloud-spikes/tasks.md` |
| Allowlist (modificar) | Ninguno |
| Comandos permitidos | Lectura, grep, git status/log/diff (safe), npm run check:encoding |
| Prohibido | api/src, web/src, shared, infra/src, package.json, npm install, AWS CLI |
| Evidencia | Los tres archivos existen y son coherentes |
| Criterio de aceptacion | Requirements verificables; Design con flujos completos; Tasks con dependencias claras |
| STOP REQUIRED | Contradiccion con product-scope-v2 o ADRs; archivo fuera de allowlist |

---

### T02 — Crear phase-3-execution-runbook

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.1 |
| Agente | Kiro (planner) |
| Dependencias | T01 completada |
| Allowlist (crear) | `docs/roadmap/phase-3-execution-runbook.md` |
| Allowlist (modificar) | Ninguno |
| Comandos permitidos | Lectura, git status/log/diff (safe) |
| Prohibido | api/src, web/src, shared, infra/src, package.json |
| Evidencia | Runbook operativo y coherente con Spec 17 |
| Criterio de aceptacion | Define IDE, agentes, worktrees, checkpoints, gates, autorizaciones, DoD |
| STOP REQUIRED | Requiere modificar documentos fuera de allowlist |

---

### T03 — Alinear delivery-roadmap-v2 y spec-map

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.1 |
| Agente | Kiro (planner) |
| Dependencias | T01 y T02 completadas |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | `docs/roadmap/delivery-roadmap-v2.md`, `docs/spec-map.md` |
| Comandos permitidos | Lectura, git status/log/diff (safe) |
| Prohibido | Cambiar alcance P0/P1/P2; reabrir fases cerradas; api/src, web/src, shared |
| Evidencia | Spec 17 marcada IN PROGRESS; estados de Fases correctos |
| Criterio de aceptacion | Solo corrige estados y nomenclatura obsoletos; no altera alcance |
| STOP REQUIRED | Cambio requerido afecta alcance o arquitectura |

---

### T04 — Preflight cloud: verificar servicios y region

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.2 |
| Agente | Kiro (aws-architect) + humano |
| Dependencias | T03 aprobada por humano; credenciales AWS activas |
| Allowlist (crear) | Ninguno (resultados en chat/handoff) |
| Allowlist (modificar) | Ninguno |
| Comandos permitidos | `aws sts get-caller-identity`, `aws bedrock list-foundation-models`, `aws sesv2 get-account`, `aws sesv2 list-email-identities`, `aws sesv2 get-email-identity --email-identity X` (todos read-only) |
| Prohibido | Cualquier comando AWS de escritura; crear recursos |
| Evidencia | Lista de servicios disponibles por region; modelo Bedrock accesible; Transcribe es-* confirmado; SES sandbox confirmado |
| Criterio de aceptacion | Region seleccionada con justificacion; permisos minimos documentados; modelo candidato identificado |
| STOP REQUIRED | Ningun servicio critico disponible en regiones accesibles; model access no aprobado (requiere console); presupuesto no confirmado |

---

### T05 — Crear rol/politica temporal de spike (manual humano)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.2 |
| Agente | Humano (con asistencia documental de Kiro) |
| Dependencias | T04 completada |
| Allowlist (crear) | Ninguno (accion manual en AWS Console o CLI por humano) |
| Allowlist (modificar) | Ninguno |
| Comandos permitidos | El humano ejecuta la creacion de politica IAM |
| Prohibido | El agente NO crea roles/politicas |
| Evidencia | ARN del rol/politica (redactado) documentado en handoff; permisos minimos verificados |
| Criterio de aceptacion | Politica scoped; sin wildcard `*` en resources donde sea posible; temporal |
| STOP REQUIRED | Permisos requeridos exceden lo propuesto en REQ-IAM-02 |

---

### T06 — Crear estructura y harness S4 (token seguro, local + PostgreSQL)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.3 |
| Agente | Kiro (implementer) o Codex (delegado) |
| Dependencias | T03 aprobada |
| Allowlist (crear) | `spikes/critical-cloud/package.json`, `spikes/critical-cloud/tsconfig.json`, `spikes/critical-cloud/.env.example`, `spikes/critical-cloud/README.md`, `spikes/critical-cloud/harnesses/s4-token-secure/**` |
| Allowlist (modificar) | `package-lock.json` (via npm install ejecutado por humano) |
| Comandos permitidos | Lectura, git diff --check; el humano ejecuta `npm install` |
| Prohibido | Modificar package.json raiz; api/src; web/src; shared; AWS CLI |
| Evidencia | Harness ejecutable; todos los criterios S4 evaluables |
| Criterio de aceptacion | Token generation, hash, validation, TTL, revocation, idempotency, state transitions y concurrencia PostgreSQL implementados y ejecutables localmente |
| STOP REQUIRED | Requiere dependencias en el monorepo raiz; requiere AWS |

---

### T07 — Crear harness S1 (Bedrock tool calling)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.3 |
| Agente | Kiro (implementer) o Codex (delegado) |
| Dependencias | T06 completada (estructura base existe) |
| Allowlist (crear) | `spikes/critical-cloud/harnesses/s1-bedrock-tool-calling/**` |
| Allowlist (modificar) | `spikes/critical-cloud/package.json` (agregar @aws-sdk/client-bedrock-runtime), `package-lock.json` (via npm install ejecutado por humano) |
| Comandos permitidos | Lectura, git diff --check; el humano ejecuta `npm install` |
| Prohibido | Modificar package.json raiz; api/src; web/src; shared; ejecutar contra AWS (eso es T10) |
| Evidencia | Harness compilable; tool definitions; fixtures; script de ejecucion |
| Criterio de aceptacion | Codigo listo para ejecutar contra Bedrock; no requiere cambios para T10 |
| STOP REQUIRED | AWS SDK no funciona sin las credenciales; eso es esperado y no bloquea |

---

### T08 — Crear harness S2 (Transcribe voz agricola)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.3 |
| Agente | Kiro (implementer) o Codex (delegado) |
| Dependencias | T06 completada |
| Allowlist (crear) | `spikes/critical-cloud/harnesses/s2-transcribe-voice/**` |
| Allowlist (modificar) | `spikes/critical-cloud/package.json` (agregar @aws-sdk/client-transcribe-streaming, @aws-sdk/client-transcribe, @aws-sdk/client-s3), `package-lock.json` (via npm install ejecutado por humano) |
| Comandos permitidos | Lectura, git diff --check; el humano ejecuta `npm install` |
| Prohibido | Modificar package.json raiz; api/src; web/src; shared; ejecutar contra AWS |
| Evidencia | Harness compilable; streaming implementado como smoke test obligatorio; batch como fallback/comparacion; fixtures de audio (streaming: FLAC/PCM; batch: WAV/MP3) |
| Criterio de aceptacion | Streaming obligatorio implementado y listo para ejecutar; batch como comparacion; no requiere UI web ni WebSocket de AGROSBO; clips sinteticos disponibles o documentado como generarlos |
| STOP REQUIRED | Clips de audio no disponibles y no se pueden generar (STOP para decision humana) |

---

### T09 — Crear harness S3 (SES eventos)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.3 |
| Agente | Kiro (implementer) o Codex (delegado) |
| Dependencias | T06 completada |
| Allowlist (crear) | `spikes/critical-cloud/harnesses/s3-ses-events/**` |
| Allowlist (modificar) | `spikes/critical-cloud/package.json` (agregar @aws-sdk/client-sesv2, @aws-sdk/client-sqs, @aws-sdk/client-cloudwatch-events), `package-lock.json` (via npm install ejecutado por humano) |
| Comandos permitidos | Lectura, git diff --check; el humano ejecuta `npm install` |
| Prohibido | Modificar package.json raiz; api/src; web/src; shared; ejecutar contra AWS |
| Evidencia | Harness compilable; deduplication logic; EventBridge rule/target lifecycle; script de ejecucion |
| Criterio de aceptacion | Codigo listo para ejecutar; deduplicacion implementada; configuration set + EventBridge lifecycle implementado; correlacion por MessageId implementada |
| STOP REQUIRED | Dependencia inesperada requerida |

---

### T10 — Ejecutar S1 contra Bedrock

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.4 |
| Agente | Humano ejecuta; Kiro analiza output sanitizado |
| Dependencias | T05 completada (permisos); T07 completada (harness) |
| Allowlist (crear) | `spikes/critical-cloud/results/manifest-s1.md` |
| Allowlist (modificar) | `spikes/critical-cloud/harnesses/s1-bedrock-tool-calling/**` (bugfixes) |
| Comandos permitidos | Humano ejecuta `npx tsx harnesses/s1-bedrock-tool-calling/index.ts`; Kiro lee output sanitizado |
| Prohibido | Crear recursos AWS permanentes; modificar monorepo; exceder budget |
| Evidencia | manifest-s1.md con metricas, PASS/FAIL, logs sanitizados |
| Criterio de aceptacion | Tool calling funciona; latencia < 30s; composicion exitosa; costo dentro de presupuesto |
| STOP REQUIRED | Budget excedido; model access denegado; todas las alternativas fallan; error no diagnosticable |

---

### T11 — Ejecutar S2 contra Transcribe

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.4 |
| Agente | Humano ejecuta; Kiro analiza output sanitizado |
| Dependencias | T05 completada; T08 completada |
| Allowlist (crear) | `spikes/critical-cloud/results/manifest-s2.md` |
| Allowlist (modificar) | `spikes/critical-cloud/harnesses/s2-transcribe-voice/**` (bugfixes) |
| Comandos permitidos | Humano ejecuta `npx tsx harnesses/s2-transcribe-voice/index.ts`; Kiro lee output sanitizado |
| Prohibido | Crear recursos permanentes; exceder budget |
| Evidencia | manifest-s2.md con WER, latencia streaming (primer parcial + final), latencia batch, PASS/FAIL |
| Criterio de aceptacion | Streaming funcional con primer parcial < 2s; WER <= 30%; batch como comparacion; resultado solo-batch = APPROVED_WITH_LIMITATIONS |
| STOP REQUIRED | Budget excedido; servicio no disponible en ninguna region accesible |

---

### T12 — Ejecutar S3 contra SES

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.4 |
| Agente | Humano ejecuta; Kiro analiza output sanitizado |
| Dependencias | T05 completada; T09 completada |
| Allowlist (crear) | `spikes/critical-cloud/results/manifest-s3.md` |
| Allowlist (modificar) | `spikes/critical-cloud/harnesses/s3-ses-events/**` (bugfixes) |
| Comandos permitidos | Humano ejecuta harness y crea/elimina recursos (SQS, EventBridge rule, SES config set); Kiro lee output sanitizado |
| Prohibido | Crear recursos permanentes; exceder budget; enviar a direcciones no verificadas |
| Evidencia | manifest-s3.md con PASS/FAIL, latencia, deduplicacion, correlacion |
| Criterio de aceptacion | Envio exitoso; evento Delivery recibido via EventBridge; deduplicacion funcional; correlacion por MessageId verificada |
| STOP REQUIRED | Budget excedido; SES no disponible; eventos no llegan tras reintentos |

---

### T13 — Ejecutar S4 (local)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.4 |
| Agente | Kiro (implementer) o Codex |
| Dependencias | T06 completada |
| Allowlist (crear) | `spikes/critical-cloud/results/manifest-s4.md` |
| Allowlist (modificar) | `spikes/critical-cloud/harnesses/s4-token-secure/**` (bugfixes) |
| Comandos permitidos | `npx tsx harnesses/s4-token-secure/index.ts` |
| Prohibido | AWS; modificar monorepo |
| Evidencia | manifest-s4.md con todos los criterios PASS/FAIL |
| Criterio de aceptacion | Todos los criterios S4 = PASS (generation, hash, validation, TTL, revocation, idempotency, transitions) |
| STOP REQUIRED | Fallo no diagnosticable en crypto (improbable) |

---

### T14 — Evaluar resultados y producir resumen ejecutivo

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.5 |
| Agente | Kiro (planner) |
| Dependencias | T10–T13 completadas |
| Allowlist (crear) | `spikes/critical-cloud/results/summary.md` |
| Allowlist (modificar) | Ninguno |
| Comandos permitidos | Lectura |
| Prohibido | Modificar monorepo; crear recursos AWS |
| Evidencia | Resumen con: servicios validados, metricas clave, decisiones informadas para Specs 18–26, riesgos residuales |
| Criterio de aceptacion | Resumen coherente con manifests individuales; decisiones diferidas identificadas |
| STOP REQUIRED | Resultado de un spike invalida una decision de ADR (reportar contradiccion) |

---

### T15 — Producir microvalidaciones documentales (M1 Polly, M2 Aurora)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.5 |
| Agente | Kiro (planner/aws-architect) |
| Dependencias | T04 completada (info de region conocida) |
| Allowlist (crear) | `spikes/critical-cloud/results/microvalidation-polly.md`, `spikes/critical-cloud/results/microvalidation-aurora.md` |
| Allowlist (modificar) | Ninguno |
| Comandos permitidos | Lectura; AWS read commands para consultar disponibilidad (opcional) |
| Prohibido | Crear recursos; modificar monorepo |
| Evidencia | Documentos con disponibilidad, costos, restricciones y conclusiones |
| Criterio de aceptacion | Informacion verificable con fuentes; conclusiones para Specs futuras |
| STOP REQUIRED | Informacion contradice un ADR |

---

### T16 — Cleanup de recursos AWS

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.6 |
| Agente | Kiro (implementer) + humano (para IAM) |
| Dependencias | T10–T12 completadas |
| Allowlist (crear) | `spikes/critical-cloud/cleanup/cleanup-checklist.md` (actualizar) |
| Allowlist (modificar) | Ninguno del monorepo |
| Comandos permitidos | AWS CLI delete commands para recursos del spike; verificacion post-delete |
| Prohibido | Eliminar recursos fuera del scope del spike; modificar monorepo |
| Evidencia | Checklist con confirmacion de eliminacion; verificacion de 0 recursos residuales |
| Criterio de aceptacion | Todos los recursos del spike eliminados; lista verificada; costos finales registrados |
| STOP REQUIRED | Un recurso no puede eliminarse (dependency lock, permission denied) |

---

### T17 — Verificar cleanup y confirmar cero recursos residuales

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.6 |
| Agente | Kiro + humano (verificacion cruzada) |
| Dependencias | T16 completada |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | `spikes/critical-cloud/cleanup/cleanup-checklist.md` |
| Comandos permitidos | AWS CLI list/describe commands; verificacion de billing |
| Prohibido | Crear recursos; modificar monorepo |
| Evidencia | Confirmacion en handoff de 0 recursos residuales |
| Criterio de aceptacion | Lista de recursos = vacia; costos finales dentro de presupuesto |
| STOP REQUIRED | Recurso residual detectado que no puede eliminarse |

---

### T18 — Actualizar capability-status-matrix y spec-map (cierre)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.7 |
| Agente | Kiro (planner) |
| Dependencias | T14–T17 completadas y aprobadas |
| Allowlist (crear) | Ninguno |
| Allowlist (modificar) | `docs/spec-map.md`, `docs/roadmap/delivery-roadmap-v2.md` |
| Comandos permitidos | Lectura; git diff --check; npm run check:encoding |
| Prohibido | Cambiar alcance P0/P1/P2; marcar IMPLEMENTED sin reimplementacion; api/src; web/src; shared |
| Evidencia | Spec 17 marcada COMPLETADA en spec-map; anotaciones VERIFIED_IN_SPIKE en matrix si aplica |
| Criterio de aceptacion | Estado de Spec 17 correcto; no se afirma IMPLEMENTED para servicios del spike |
| STOP REQUIRED | Resultado del spike invalida el roadmap (requiere decision humana) |

---

### T19 — Handoff final de Fase 3 (Spec 17)

| Campo | Valor |
|-------|-------|
| Checkpoint | 3.7 |
| Agente | Kiro |
| Dependencias | T18 completada; quality gates verdes |
| Allowlist (crear) | Ninguno (output en chat) |
| Allowlist (modificar) | Ninguno |
| Comandos permitidos | git status, git diff --check, npm run format, npm run check:encoding, npm run lint, npm run typecheck, npm test, npm run build; commit, push y PR únicamente con autorización humana explícita |
| Prohibido | git merge; deploy; commit, push o PR sin autorización humana |
| Evidencia | Handoff estructurado conforme a template |
| Criterio de aceptacion | Handoff completo; all quality gates PASS (npm run format, npm run check:encoding, npm run lint, npm run typecheck, npm test, npm run build, git diff --check); confirmacion de: 0 recursos AWS residuales, 0 commit sin auth, 0 push, 0 deploy; plan de commits propuesto |
| STOP REQUIRED | Esperando autorizacion humana para commit y push |

## 4. Dependencias entre tareas

```text
T01 → T02 → T03 [PUERTA HUMANA — aprobacion de Spec]
T03 (aprobada) → T04 → T05 [PUERTA HUMANA — permisos cloud listos]
T03 (aprobada) → T06 (local, puede empezar sin cloud)
T05 + T06 → T07, T08, T09 (paralelas)
T06 → T13 (S4 es local, puede ejecutarse antes del cloud)
T05 + T07 → T10
T05 + T08 → T11
T05 + T09 → T12
T10 + T11 + T12 + T13 → T14
T04 → T15 (microvalidaciones documentales)
T10 + T11 + T12 → T16 → T17 [PUERTA HUMANA — cleanup verificado]
T14 + T15 + T17 → T18 → T19 [PUERTA HUMANA — cierre]
```

### Tracks paralelos (solo despues de aprobar Design y preflight cloud)

```text
Track A: S1 (Bedrock) + S2 (Transcribe) — requieren permisos cloud
Track B: S3 (SES) + S4 (Token) — SES requiere cloud; S4 es local

S4 puede ejecutarse inmediatamente despues de T06 (no requiere cloud).
```

### Integracion secuencial

Aunque los tracks A y B pueden ser paralelos, la evaluacion (T14), cleanup
(T16-T17) y cierre (T18-T19) son secuenciales y requieren que todos los spikes
esten completados.

## 5. Resumen de allowlists por checkpoint

| Checkpoint | Crear | Modificar |
|-----------|-------|-----------|
| 3.1 | `.kiro/specs/critical-cloud-spikes/*`, `docs/roadmap/phase-3-execution-runbook.md` | `docs/roadmap/delivery-roadmap-v2.md`, `docs/spec-map.md` |
| 3.2 | Ninguno (acciones cloud read-only + manual IAM) | Ninguno |
| 3.3 | `spikes/critical-cloud/**` | `spikes/critical-cloud/package.json`, `package-lock.json` |
| 3.4 | `spikes/critical-cloud/results/manifest-s*.md` | `spikes/critical-cloud/harnesses/**` (bugfixes) |
| 3.5 | `spikes/critical-cloud/results/summary.md`, `spikes/critical-cloud/results/microvalidation-*.md` | Ninguno |
| 3.6 | Ninguno | `spikes/critical-cloud/cleanup/cleanup-checklist.md` |
| 3.7 | Ninguno | `docs/spec-map.md`, `docs/roadmap/delivery-roadmap-v2.md` |

## 6. Responsables por tarea

| Tarea | Responsable principal | Responsable delegado posible |
|-------|----------------------|------------------------------|
| T01–T03 | Kiro (planner) | — |
| T04 | Kiro (aws-architect) | — |
| T05 | Humano | Kiro asiste con documentacion |
| T06–T09 | Kiro (implementer) | Codex (si aprobado con worktree propio) |
| T10–T12 | Kiro (implementer) | Codex (si aprobado) |
| T13 | Kiro (implementer) | Codex |
| T14–T15 | Kiro (planner) | — |
| T16–T17 | Kiro (implementer) + humano | — |
| T18–T19 | Kiro (planner) | — |

## 7. Estado final

| Tarea | Estado |
|-------|--------|
| T01–T03 | COMPLETED — kickoff documental |
| T04 | PASS — preflight cloud |
| T05 | PASS — permisos temporales disponibles durante ejecución |
| T06–T09 | COMPLETED — harnesses S1–S4 |
| T10 | **BLOCKED_EXTERNAL_QUOTA** — auth, IAM y endpoint PASS; tool calling diferido a Spec 21 |
| T11 | **PASS** — Transcribe streaming |
| T12 | **PASS** — SES → EventBridge → SQS |
| T13 | **PASS** — token seguro, 21/21 |
| T14 | COMPLETED — `results/summary.md` |
| T15 | COMPLETED — microvalidaciones Polly y Aurora/Data API |
| T16 | PASS — inventario vacío; no fueron necesarias eliminaciones |
| T17 | PASS — waiver humano — cero residuos; Billing pendiente |
| T18 | COMPLETED — reconciliación documental |
| T19 | COMPLETED — gates, auditoría y handoff final |

## 8. Definition of Done — Spec 17

- [x] Requirements, Design y Tasks coherentes y trazables.
- [x] phase-3-execution-runbook completo.
- [x] delivery-roadmap-v2 y spec-map actualizados.
- [x] Preflight cloud completado (region y permisos documentados).
- [x] Harnesses S1–S4 creados y ejecutables.
- [x] S1 documentado como BLOCKED_EXTERNAL_QUOTA por decisión humana; validación funcional diferida a Spec 21.
- [x] S2 (Transcribe voz agricola): PASS documentado con evidencia.
- [x] S3 (SES eventos): PASS documentado con evidencia.
- [x] S4 (Token seguro): PASS documentado con evidencia.
- [x] Microvalidaciones M1 y M2 documentadas.
- [x] Resumen ejecutivo producido.
- [x] Cleanup completado y verificado (0 recursos residuales).
- [x] Billing final PENDING_HUMAN_BILLING_CONFIRMATION con waiver humano explícito.
- [x] Quality gates del monorepo verdes (npm run format, npm run check:encoding, npm run lint, npm run typecheck, npm test, npm run build, git diff --check).
- [x] Cero codigo funcional en api/src, web/src, shared, infra/src modificado.
- [x] Cero dependencias del monorepo modificadas.
- [x] Spike code en spikes/critical-cloud/ no importado por produccion.
- [x] Cero recursos AWS residuales post-cleanup.
- [x] Ningun commit, push, PR, merge o deploy sin autorizacion humana.
- [x] Handoff final producido.

## 9. Trazabilidad Tasks → Requirements

| Tarea | Requirements cubiertos |
|-------|----------------------|
| T01 | Formalizacion de todos los REQ-* |
| T02 | REQ-STP-*, procedimiento operativo |
| T03 | REQ-DIS-04 (no marcar IMPLEMENTED) |
| T04 | REQ-REG-01–04, REQ-IAM-01–02 |
| T05 | REQ-IAM-03–04, REQ-SEC-02, REQ-SEC-06 |
| T06 | Criterios S4, REQ-SEC-04 |
| T07 | Criterios S1, REQ-MET-01 |
| T08 | Criterios S2, REQ-MET-01 |
| T09 | Criterios S3, REQ-SEC-07, REQ-MET-01 |
| T10 | Criterios S1 (ejecucion), REQ-COST-01–02 |
| T11 | Criterios S2 (ejecucion), REQ-COST-01–02 |
| T12 | Criterios S3 (ejecucion), REQ-COST-01–02 |
| T13 | Criterios S4 (ejecucion) |
| T14 | REQ-EVD-01–04, REQ-DIS-01–03 |
| T15 | M1, M2 (microvalidaciones) |
| T16 | REQ-CLN-01–04 |
| T17 | REQ-CLN-02, REQ-CLN-05 |
| T18 | REQ-DIS-04, REQ-NEG-07 |
| T19 | REQ-STP-02, REQ-EVD-01 |
