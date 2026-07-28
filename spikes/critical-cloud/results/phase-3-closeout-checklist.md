# Phase 3 Closeout Checklist — Spec 17

## Resultado final

| Área | Estado |
|---|---|
| S1 Bedrock | **BLOCKED_EXTERNAL_QUOTA** |
| S2 Transcribe | **PASS** |
| S3 SES → EventBridge → SQS | **PASS** |
| S4 token seguro | **PASS** |
| Residuos AWS | **0** |
| Billing | **PENDING_HUMAN_BILLING_CONFIRMATION — waiver explícito** |
| Código productivo modificado | **0 archivos** |
| Deploys | **0** |

## T14 — Resumen ejecutivo

- [x] Manifests S1–S4 revisados.
- [x] `summary.md` creado y coherente con los manifests.
- [x] Región `us-east-1` documentada sin fijarla para producción.
- [x] Nova Lite y Nova Micro documentados sin selección productiva.
- [x] WER, latencias disponibles, número de tests y limitación TTS registrados.
- [x] S1 clasificado como `BLOCKED_EXTERNAL_QUOTA`.
- [x] S2–S4 clasificados `VERIFIED_IN_SPIKE`, nunca `IMPLEMENTED`.
- [x] Capacidades productivas ausentes clasificadas `NOT_IMPLEMENTED`.
- [x] Costos finales marcados `PENDING_HUMAN_BILLING_CONFIRMATION`.
- [x] Waiver humano y riesgo residual de Billing incluidos.
- [x] Decisiones diferidas para Specs 18–26 trazadas.
- [x] Sin account IDs, ARNs reales, correos privados ni credenciales.

## T15 — Microvalidaciones

### Polly

- [x] Voces `es-US`, `es-ES` y `es-MX` revisadas con fuente oficial.
- [x] Engines Standard, Neural, Long-form y Generative documentados según
      disponibilidad read-only en `us-east-1`.
- [x] Formatos `mp3`, `ogg_vorbis`, `ogg_opus`, `pcm`, `mulaw`, `alaw` y
      speech marks JSON documentados.
- [x] Sample rates relevantes y PCM mono signed 16-bit LE documentados.
- [x] Riesgo de sesgo Polly → Transcribe explícito.
- [x] Precios exactos marcados `NEEDS_OFFICIAL_VERIFICATION`.
- [x] Decisión productiva diferida a Spec 23.
- [x] Ninguna capacidad marcada `IMPLEMENTED`.

### Aurora PostgreSQL + Data API

- [x] Disponibilidad en `us-east-1` documentada.
- [x] Disponibilidad en `sa-east-1` corregida con tabla oficial vigente.
- [x] Versiones mínimas de Aurora PostgreSQL 13–17 documentadas.
- [x] Límites vigentes de response, row, JSON, request, timeout y transacción
      documentados.
- [x] Restricciones writer, global secondary, clases T y `scram-sha-256`
      documentadas.
- [x] Impacto en dual-path `pg` / Data API registrado.
- [x] Validación real y decisión final diferidas a Spec 18.
- [x] Ninguna capacidad marcada `IMPLEMENTED`.

## T16 — Cleanup

- [x] Cuenta, rol y región verificados antes del inventario.
- [x] Inventario limitado a recursos inequívocos de Spec 17.
- [x] Buckets/objetos `agrosbo-spike*`: 0.
- [x] Transcribe jobs/vocabularies: 0.
- [x] SQS queues: 0.
- [x] EventBridge rules/targets: 0.
- [x] SES configuration sets/event destinations: 0.
- [x] CloudWatch log groups del spike: 0.
- [x] `AgrosboSpikeTemporaryPolicy`: 0.
- [x] Identidad SES preservada.
- [x] `AgrosboDeveloperRole` preservado.
- [x] No se ejecutaron deletes porque el inventario ya estaba vacío.
- [x] Comandos sanitizados registrados en `cleanup-plan.md`.

## T17 — Verificación

- [x] Segunda consulta confirma cero buckets.
- [x] Segunda consulta confirma cero queues.
- [x] Segunda consulta confirma cero rules/targets.
- [x] Segunda consulta confirma cero configuration sets/destinations.
- [x] Segunda consulta confirma cero jobs/vocabularies.
- [x] Segunda consulta confirma cero policies temporales.
- [x] Segunda consulta confirma cero log groups del spike.
- [x] `ZERO_RESIDUE_ALL=true`.
- [x] Cost Explorer consultado; datos todavía `Estimated=true`.
- [x] Costo final conservado como `PENDING_HUMAN_BILLING_CONFIRMATION`.
- [x] Waiver humano explícito concedido el 2026-07-28.
- [x] El waiver no se interpretó como USD 0.00.

## T18 — Reconciliación documental

- [x] `tasks.md` actualizado con T10–T19.
- [x] T10 = `BLOCKED_EXTERNAL_QUOTA`.
- [x] T11 = PASS.
- [x] T12 = PASS.
- [x] T13 = PASS.
- [x] `docs/spec-map.md` marca Spec 17 y Fase 3 completadas.
- [x] `docs/roadmap/delivery-roadmap-v2.md` marca Spec 17 y Fase 3 completadas.
- [x] Runbook de Fase 3 actualizado a estado completado.
- [x] Capability matrix conserva estados productivos y añade solo
      `VERIFIED_IN_SPIKE`.
- [x] No se alteró alcance P0/P1/P2.
- [x] No se inició Spec 18.

## T19 — Quality gates

| Gate | Resultado |
|---|---|
| `npm run format` | PASS |
| `npm run check:encoding` | PASS |
| `npm run lint` | PASS — 0 errores, 154 warnings preexistentes |
| `npm run typecheck` | PASS |
| `npm test` | PASS final — 132/132 |
| `npm run build` | PASS |
| `git diff --check` | PASS |

El primer `npm test` se ejecutó simultáneamente con build y registró cinco
timeouts por contención. El rerun aislado, sin cambios de código ni de
timeouts, pasó 132/132.

### Workspace `spikes/critical-cloud`

| Check | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | PASS |
| S1 `--dry-run` | 12/12 PASS; cero llamadas AWS |
| S2 dry-run | 40/40 PASS; cero llamadas AWS |
| S3 dry-run | 60/60 PASS; cero llamadas AWS |
| S4 local | 18/18 PASS |

S1 imprimió el veredicto completo pero retuvo un handle del proceso después de
finalizar las pruebas. No se ejecutó `s1:live` ni ninguna invocación Bedrock.

## Auditoría de seguridad y Git

- [x] Sin access keys, secret keys ni session tokens.
- [x] Sin account IDs.
- [x] Sin ARNs reales.
- [x] Sin correos privados.
- [x] Sin rutas locales personales en archivos modificados.
- [x] Placeholders y nombres públicos de servicios revisados.
- [x] `package.json` y `package-lock.json` sin cambios.
- [x] `api/src`, `web/src`, `shared` e `infra/src` sin cambios.
- [x] Staging por rutas explícitas.
- [x] Commit y push autorizados por el humano.
- [x] PR draft autorizado contra `main`.
- [x] Merge prohibido y no ejecutado.
- [x] Cero deploys.

## Definition of Done

Fase 3 / Spec 17 queda cerrada con S1 `BLOCKED_EXTERNAL_QUOTA`, S2–S4 PASS,
cero residuos AWS, Billing pendiente bajo waiver, gates verdes y handoff
preparado. El siguiente trabajo requiere una autorización separada; este cierre
no continúa con Spec 18.
