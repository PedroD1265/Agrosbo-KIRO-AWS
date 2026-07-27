# Resumen Ejecutivo — Fase 3 Spikes (Spec 17)

<!-- STATUS: TEMPLATE — WAITING FOR T10/T11/T12/T13 -->
<!-- Rellenar después de que T10–T13 estén completos (Checkpoint 3.5 — T14). -->
<!-- No afirmar PASS en ningún servicio cloud sin evidencia de los manifests individuales. -->

---

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T14 |
| Período de ejecución | [RELLENAR: fecha inicio T10 — fecha fin T12/T13] |
| Región utilizada | [RELLENAR — de manifest-s1.md y manifest-s2.md] |
| Rama | replit/spec-17-cloud-prep |
| Commit base | 44da638 |
| Preparado por | Replit (acceleration) / Kiro (planner) |
| STATUS | **TEMPLATE — WAITING FOR T10/T11/T12/T13** |

---

## Resumen ejecutivo

[RELLENAR: 3–5 oraciones describiendo los resultados generales de la Fase 3.
Incluir: cuántos spikes PASS/PARTIAL/FAIL, el resultado más significativo para el
roadmap, y cualquier bloqueante identificado para Specs 18+.]

---

## Tabla de resultados por spike

| Spike | Servicio | Veredicto | Latencia p50 | Latencia p95 | Costo real | Notas |
|---|---|---|---|---|---|---|
| S1 | Amazon Bedrock | [RELLENAR] | [RELLENAR] ms | [RELLENAR] ms | USD [RELLENAR] | [RELLENAR] |
| S2 | Amazon Transcribe | [RELLENAR] | [RELLENAR] ms | [RELLENAR] ms | USD [RELLENAR] | [RELLENAR] |
| S3 | SES/EventBridge/SQS | [RELLENAR] | [RELLENAR] ms | [RELLENAR] ms | USD [RELLENAR] | [RELLENAR] |
| S4 | Token (local) | **PASS** (Part A + B: 21/21) | N/A | N/A | USD 0.00 | Throughput: 215,413 ops/seg |
| **TOTAL** | | | | | **USD [RELLENAR]** | |

---

## Región

| Campo | Valor |
|---|---|
| Región seleccionada | [RELLENAR — de T04] |
| Justificación de selección | [RELLENAR: disponibilidad de Bedrock + Transcribe + SES] |
| Esta región NO fija la región de producción | Confirmado (REQ-REG-04) |
| Región de producción | Se decide en Spec 18 Design |

---

## Modelo Bedrock

| Campo | Valor |
|---|---|
| Modelo utilizado en el spike | [RELLENAR: ID exacto] |
| Tool calling funcional | [RELLENAR: Sí / No] |
| Latencia p50 | [RELLENAR] ms |
| Costo por operación completa | USD [RELLENAR] |
| Este modelo NO está fijado para producción | Confirmado (REQ-NEG-02) |
| Modelo de producción | Se decide en Spec 21 |

---

## Locales Transcribe

| Locale | WER promedio | Streaming funcional | Custom vocabulary mejora |
|---|---|---|---|
| [RELLENAR: ej. es-US] | [RELLENAR] % | [RELLENAR] | [RELLENAR] |
| [RELLENAR: ej. es-ES] | [RELLENAR] % | [RELLENAR] | N/A |
| es-MX (si probado) | [RELLENAR] % | [RELLENAR] | N/A |

---

## Arquitectura S3 (SES → EventBridge → SQS)

| Aspecto | Estado observado | Implicación para Spec 24 |
|---|---|---|
| SES → EventBridge event routing | [RELLENAR] | [RELLENAR] |
| Correlación por MessageId | [RELLENAR: PASS/FAIL] | [RELLENAR] |
| Deduplicación en memoria | [RELLENAR: PASS/FAIL] | [RELLENAR] |
| Tolerancia a orden de eventos | [RELLENAR: PASS/FAIL] | [RELLENAR] |
| Bounce via Mailbox Simulator | [RELLENAR: PASS/PARTIAL] | Limitación de sandbox documentada |

---

## WER — resumen S2

| Métrica | Valor |
|---|---|
| WER promedio (mejor locale, streaming) | [RELLENAR] % |
| WER mínimo (clip más fácil) | [RELLENAR] % |
| WER máximo (clip más difícil) | [RELLENAR] % |
| WER con custom vocabulary (si probado) | [RELLENAR] % |
| Criterio PASS (<= 30%) | [RELLENAR: cumplido / no cumplido] |
| Nota | Si clips son TTS Polly: el WER puede subestimar la dificultad con voz humana |

---

## Costos

| Campo | Valor |
|---|---|
| Presupuesto aprobado | USD 3.50 |
| Costo real S1 (Bedrock) | USD [RELLENAR] |
| Costo real S2 (Transcribe) | USD [RELLENAR] |
| Costo real S3 (SES/SQS/EventBridge) | USD [RELLENAR] |
| Costo real S4 (local) | USD 0.00 |
| **Costo total real** | **USD [RELLENAR]** |
| Dentro del presupuesto | [RELLENAR: Sí / No] |
| Margen no utilizado | USD [RELLENAR] |

---

## Errores y excepciones

| Spike | Error | Resolución | Impacto |
|---|---|---|---|
| [RELLENAR o N/A] | [RELLENAR] | [RELLENAR] | [RELLENAR] |

---

## Estado de cleanup

| Spike | Recursos creados | Recursos eliminados | Costo post-cleanup |
|---|---|---|---|
| S1 | 0 | N/A | USD 0.00 |
| S2 | Bucket S3 + jobs Transcribe + custom vocab (si aplica) | [RELLENAR] | USD 0.00 (post-cleanup) |
| S3 | SQS queue + EventBridge rule + SES config set | [RELLENAR] | USD 0.00 (post-cleanup) |
| S4 | 0 | N/A | USD 0.00 |

---

## Riesgos residuales

| Riesgo | Descripción | Impacto | Spec afectada |
|---|---|---|---|
| [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] |

---

## Decisiones para Specs 18–26

Las siguientes decisiones son informadas por los spikes pero NO fijadas aquí.
Cada una se toma en la Spec correspondiente.

| Decisión | Estado en Spec 17 | Se toma en |
|---|---|---|
| Región de producción | Spike usó [RELLENAR]; no vinculante | Spec 18 |
| Modelo Bedrock definitivo | Spike usó [RELLENAR]; no vinculante | Spec 21 |
| Motor STT definitivo | Spike validó Transcribe; otras opciones no exploradas | Spec 23 |
| Locale definitivo para Transcribe | Spike evaluó [RELLENAR] locales | Spec 23 |
| Custom vocabulary permanente | Spike probó vocabulario básico | Spec 23 |
| Arquitectura recepción eventos SES en producción | Spike validó SES→EventBridge→SQS | Spec 24 |
| Esquema de tablas para tokens | Spike validó lógica; esquema productivo no definido | Spec 24 |
| CloudFront /api/* topology | No evaluado en spike | Spec 18/19 |

---

## Capacidades: VERIFIED_IN_SPIKE vs NOT_IMPLEMENTED

| Capacidad | Estado tras Spec 17 |
|---|---|
| Bedrock tool calling (Converse API) | VERIFIED_IN_SPIKE (si S1 PASS) / NOT_VERIFIED (si FAIL) — [RELLENAR] |
| Transcribe voz agrícola es-* | VERIFIED_IN_SPIKE (si S2 PASS) / APPROVED_WITH_LIMITATIONS / NOT_VERIFIED — [RELLENAR] |
| SES → EventBridge → SQS event flow | VERIFIED_IN_SPIKE (si S3 PASS) / NOT_VERIFIED — [RELLENAR] |
| Token opaco SHA-256 + máquina de estados | VERIFIED_IN_SPIKE (Part A + Part B: 21/21 PASS) |
| Aurora Serverless v2 + Data API | NOT_IMPLEMENTED — documentación solo (M2); validación en Spec 18 |
| Amazon Polly voces es-* | NOT_IMPLEMENTED — documentación solo (M1) |

> **VERIFIED_IN_SPIKE**: servicio invocado exitosamente en harness aislado; métricas
> conocidas; informa pero no reemplaza la implementación productiva (REQ-DIS-01).
>
> **NOT_IMPLEMENTED**: no existe código en `api/src/`, `web/src/`, `shared/`, ni `infra/src/`.
> El código de spikes es desechable y no se importa en producción (REQ-DIS-03).

---

## Decisiones diferidas — estado final

| Decisión diferida | Referencia | Acción requerida |
|---|---|---|
| Modelo Bedrock producción | design.md §12.2 | Spec 21 |
| Región de producción | design.md §12.2 | Spec 18 |
| STT motor definitivo | design.md §12.2 | Spec 23 |
| Arquitectura SES eventos producción | Spike validó SES→EventBridge→SQS; decisión definitiva | Spec 24 |
| Custom vocabulary permanente | design.md §12.2 | Spec 23 |
| CloudFront /api/* routing | design.md §12.2 | Spec 18/19 |
| Esquema tablas tokens producción | design.md §12.2 | Spec 24 |

---

<!-- FIN DEL TEMPLATE — completar con resultados reales de T10–T13 para producir summary.md -->
