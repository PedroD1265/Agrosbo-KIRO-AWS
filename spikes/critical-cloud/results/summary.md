# Resumen ejecutivo — Fase 3 / Spec 17

## Estado de cierre

Spec 17 validó cuatro capacidades mediante harnesses aislados y datos
sintéticos. La evidencia de spike no constituye implementación productiva.

| Spike | Resultado final | Clasificación honesta | Evidencia principal |
|---|---|---|---|
| S1 — Bedrock tool calling | **BLOCKED_EXTERNAL_QUOTA** | Autenticación, IAM, endpoint y acceso a Nova Lite/Micro alcanzados; tool calling **NOT EVALUATED** | Ambos modelos respondieron `ThrottlingException` por cuota diaria externa antes de generar contenido |
| S2 — Transcribe streaming | **PASS** | **VERIFIED_IN_SPIKE**; capacidad productiva **NOT_IMPLEMENTED** | 3/3 clips live, WER promedio 18.1%, 43/43 casos |
| S3 — SES → EventBridge → SQS | **PASS** | **VERIFIED_IN_SPIKE**; capacidad productiva **NOT_IMPLEMENTED** | 6/6 casos live + 60/60 locales; correlación y cleanup verificados |
| S4 — token externo seguro | **PASS** | **VERIFIED_IN_SPIKE**; capacidad productiva **NOT_IMPLEMENTED** | 18/18 crypto/in-memory + 3/3 PostgreSQL |

## Alcance y región

- Región usada para S1–S3: `us-east-1`.
- La región se validó para los spikes; no queda fijada como región productiva.
- S4 se ejecutó localmente con un PostgreSQL desechable dedicado.
- No se modificó código productivo ni se desplegó infraestructura.

## Evidencia consolidada

### S1 — Bedrock

| Campo | Resultado |
|---|---|
| Modelos probados | `amazon.nova-lite-v1:0`, `amazon.nova-micro-v1:0` |
| Intentos | 2 |
| Tool calls | 0 |
| Autenticación / IAM / endpoint | PASS / PASS / PASS |
| Respuesta funcional | Bloqueada por cuota diaria externa |
| `tool_use`, `tool_result`, composición | NOT EVALUATED |
| Latencia funcional | N/A |
| Recursos creados | 0 |
| Costo final | **PENDING_HUMAN_BILLING_CONFIRMATION** |

S1 no es PASS y tampoco evidencia un fallo del harness o de la integración.
La decisión humana es cerrar como **BLOCKED_EXTERNAL_QUOTA**, sin nuevos
intentos en Spec 17, y diferir la validación funcional a Spec 21.

### S2 — Transcribe

| Métrica | Resultado |
|---|---|
| Modo / locale | Streaming PCM 16-bit LE, 16 kHz, `es-US` |
| Clips live | 3 |
| WER por clip | 7.7%, 20.0%, 26.7% |
| WER promedio | **18.1%** |
| Latencia total por clip | 4,171–5,692 ms; promedio 4,805 ms |
| Casos del harness | **43/43 PASS** |
| Recursos persistentes | 0 |
| Costo estimado en manifest | < USD 0.05 |
| Costo final | **PENDING_HUMAN_BILLING_CONFIRMATION** |

Los clips fueron generados con Polly Neural, voz Lupe. El WER tiene sesgo
positivo por pronunciación sintética limpia, ausencia de ruido y falta de
acentos humanos de campo. Voz humana, otros locales, vocabulario custom y
normalización numérica quedan para Spec 23.

### S3 — SES / EventBridge / SQS

| Métrica | Resultado |
|---|---|
| Casos live | **6/6 PASS** |
| Casos locales/dry-run | **60/60 PASS** |
| Correlación por MessageId | PASS |
| Deduplicación / fuera de orden | PASS en tests locales |
| Latencia live | No reportada numéricamente en el manifest |
| Recursos creados/eliminados | 5 / 5 durante la ejecución |
| Residuos verificados en cierre | 0 |
| Costo estimado en manifest | < USD 0.01 |
| Costo final | **PENDING_HUMAN_BILLING_CONFIRMATION** |

La ejecución se limitó al sandbox de SES. La identidad verificada fue
preservada y la arquitectura productiva definitiva se decide en Spec 24.

### S4 — token externo seguro

| Métrica | Resultado |
|---|---|
| Crypto + memoria | **18/18 PASS** |
| Concurrencia PostgreSQL | **3/3 PASS** |
| Total | **21/21 PASS** |
| Entropía | 256 bits |
| Hash | SHA-256; raw token no persistido |
| Throughput observado | 215,413 ops/s en Part A; 178,301 ops/s en Part B |
| Concurrencia | 10 solicitudes; 1 transición y 9 resultados idempotentes |
| Recursos AWS | 0 |
| Costo AWS | USD 0.00 — ejecución local |

El patrón queda validado en aislamiento. El esquema, endpoints, rate limiting,
persistencia y observabilidad productivos siguen **NOT_IMPLEMENTED**.

## Cleanup y residuos

El inventario y la verificación posterior se ejecutaron con AWS CLI read-only
en la cuenta y región verificadas. No se encontraron recursos que eliminar:

| Tipo | Residuos |
|---|---:|
| Buckets/objetos `agrosbo-spike*` | 0 |
| Transcribe jobs/vocabularies | 0 |
| SQS queues | 0 |
| EventBridge rules/targets | 0 |
| SES configuration sets/event destinations | 0 |
| CloudWatch log groups del spike | 0 |
| `AgrosboSpikeTemporaryPolicy` | 0 |

No se eliminó la identidad SES ni `AgrosboDeveloperRole`. No se ejecutaron
comandos AWS de escritura porque el inventario ya estaba vacío.

## Costos y waiver

Estado final de Billing: **PENDING_HUMAN_BILLING_CONFIRMATION**.

Cost Explorer devolvió datos `Estimated=true` y totales diarios de cuenta no
aislables por run. Bedrock, Transcribe y SES todavía no mostraban cargos
publicados. El costo pendiente no se interpreta como USD 0.00 y no se inventa
un total.

El 2026-07-28 el humano concedió un waiver explícito para cerrar Spec 17 con
Billing pendiente. Este waiver satisface la puerta de cierre, pero el importe
final sigue siendo un riesgo residual y deberá confirmarse posteriormente.

## Riesgos residuales y decisiones diferidas

| Spec | Decisión diferida / riesgo |
|---|---|
| 18 | Región productiva, engine Aurora, configuración Serverless v2, Data API y validación del dual-path |
| 19 | Despliegue y observabilidad del core; los spikes no demuestran readiness productiva |
| 20 | Auth cloud y adjuntos no fueron implementados ni validados por Spec 17 |
| 21 | Tool calling Bedrock real, modelo definitivo, calidad, latencia y costo; S1 sigue bloqueado externamente |
| 22 | Mutaciones y confirmaciones del agente no fueron parte de estos spikes |
| 23 | Voz humana de campo, locales, custom vocabulary, normalización, Polly y costos reales |
| 24 | Token, SES, deduplicación persistente y arquitectura de eventos productivos |
| 25 | Bedrock multimodal no fue evaluado |
| 26 | Motores de escenarios no fueron evaluados |

Riesgos transversales:

- Billing final continúa pendiente bajo waiver humano.
- S1 no aporta evidencia funcional de tool calling.
- S2 usa audio TTS limpio y puede subestimar el WER real.
- S3 operó en SES sandbox y las pruebas de orden/deduplicación fueron locales.
- Ningún resultado de spike equivale a capacidad **IMPLEMENTED**.

## Cierre

Fase 3 / Spec 17 se cierra con S1 **BLOCKED_EXTERNAL_QUOTA** y S2–S4
**PASS**, cero residuos AWS verificados, Billing pendiente bajo waiver y todas
las decisiones productivas diferidas a las Specs correspondientes. No se inicia
Spec 18 como parte de este cierre.
