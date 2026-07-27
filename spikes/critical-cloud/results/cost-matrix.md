# Matriz de Costos — Fase 3 Spikes

## Presupuesto total aprobado: USD 3.50

Fuente: requirements.md REQ-COST-01, runbook §8.

> **Instrucción de llenado**: los campos marcados PENDING se completan después
> de ejecutar cada spike. No inventar costos actuales. Para precios actuales,
> verificar en https://aws.amazon.com/<servicio>/pricing/ antes de ejecutar.

---

## S1 — Bedrock (T10)

| Campo | Valor |
|---|---|
| Unidad de facturación | Tokens de entrada + tokens de salida |
| Presupuesto límite aprobado | <= USD 2.00 |
| Fuente oficial de precios | https://aws.amazon.com/bedrock/pricing/ |
| Fecha de consulta de precios | **PENDING OFFICIAL CHECK** — verificar antes de T10 |

### Estimación de volumen (borrador, sujeto a precios actuales)

| Métrica | Estimación |
|---|---|
| Invocaciones planificadas | ~5 llamadas completas (tool calling completo: prompt + tool_use + tool_result + respuesta final) |
| Tokens de entrada estimados por ronda completa | ~2,000–3,000 tokens (system + user + tools + tool_result) |
| Tokens de salida estimados por ronda completa | ~500–1,000 tokens (tool_use response + respuesta final) |
| Total tokens entrada estimados (5 rondas) | ~10,000–15,000 |
| Total tokens salida estimados (5 rondas) | ~2,500–5,000 |

### Precios actuales

| Modelo | Precio input (USD/1M tokens) | Precio output (USD/1M tokens) | Fuente |
|---|---|---|---|
| amazon.nova-lite-v1:0 | **PENDING OFFICIAL CHECK** | **PENDING OFFICIAL CHECK** | https://aws.amazon.com/bedrock/pricing/ |
| anthropic.claude-3-haiku | **PENDING OFFICIAL CHECK** | **PENDING OFFICIAL CHECK** | Misma fuente |
| Modelo seleccionado en T04 | **PENDING OFFICIAL CHECK** | **PENDING OFFICIAL CHECK** | Verificar con el modelo exacto |

### Fórmula de cálculo

```
Costo_S1 = (tokens_entrada_total / 1,000,000) × precio_input
         + (tokens_salida_total / 1,000,000) × precio_output
```

### Campos post-ejecución

| Campo | Valor |
|---|---|
| Modelo utilizado | PENDING |
| Región | PENDING |
| Tokens de entrada reales | PENDING |
| Tokens de salida reales | PENDING |
| Costo real USD | PENDING |
| Margen de seguridad restante | PENDING (= USD 2.00 − costo real) |
| Condición de parada activada | No / Sí — PENDING |

---

## S2 — Transcribe (T11)

| Campo | Valor |
|---|---|
| Unidad de facturación | Por segundo de audio transcrito (redondeado a 15s mínimo para batch) |
| Presupuesto límite aprobado | <= USD 1.00 |
| Fuente oficial de precios | https://aws.amazon.com/transcribe/pricing/ |
| Fecha de consulta de precios | **PENDING OFFICIAL CHECK** — verificar antes de T11 |

### Estimación de volumen

| Métrica | Estimación |
|---|---|
| Modo principal | Streaming (`StartStreamTranscription`) |
| Clips planificados | 3–5 clips de 5–15 segundos cada uno |
| Duración total estimada | ~40–75 segundos |
| Rondas (baseline + custom vocab) | 2 rondas si hay presupuesto |
| Duración total máxima estimada | ~150 segundos |

### Precios actuales

| Modo | Precio | Fuente |
|---|---|---|
| Streaming (es-US o es-ES) | **PENDING OFFICIAL CHECK** | https://aws.amazon.com/transcribe/pricing/ |
| Batch (fallback) | **PENDING OFFICIAL CHECK** | Misma fuente |
| Custom Vocabulary (creación) | Generalmente sin costo adicional por creación | **PENDING OFFICIAL CHECK** |

### Fórmula de cálculo

```
Costo_S2_streaming = (segundos_audio_total / 1) × precio_por_segundo_streaming
Costo_S2_batch     = max(segundos_clip, 15) × precio_por_segundo_batch × num_clips

Costo_S2 = Costo_S2_streaming + Costo_S2_batch (si se ejecutan ambos)
```

Nota: S3 (bucket temporal para batch) tiene costo adicional minimal — ver fila S3 en
esta tabla.

### Campos post-ejecución

| Campo | Valor |
|---|---|
| Locale probado | PENDING |
| Clips transcritos | PENDING |
| Duración total real (seg) | PENDING |
| Modo(s) ejecutados | PENDING |
| Costo real USD | PENDING |
| Margen restante | PENDING |
| Condición de parada activada | No / Sí — PENDING |

---

## S3 — SES / EventBridge / SQS (T12)

| Campo | Valor |
|---|---|
| Unidad de facturación | Por correo enviado (SES) + por mensaje SQS + requests EventBridge |
| Presupuesto límite aprobado | <= USD 0.50 |
| Fuente oficial de precios SES | https://aws.amazon.com/ses/pricing/ |
| Fuente oficial de precios SQS | https://aws.amazon.com/sqs/pricing/ |
| Fuente oficial de precios EventBridge | https://aws.amazon.com/eventbridge/pricing/ |
| Fecha de consulta | **PENDING OFFICIAL CHECK** — verificar antes de T12 |

### Estimación de volumen

| Servicio | Volumen estimado |
|---|---|
| Correos enviados (SES) | ~10–15 correos (incluyendo bounce y complaint simulados) |
| Mensajes SQS recibidos y eliminados | ~30–50 mensajes |
| EventBridge rules invocadas | ~30–50 invocaciones |
| S3 (bucket temporal audio S2 batch) | ~5 objetos × ~100KB = ~0.5 MB, ciclo de vida < 1 hora |

### Precios actuales

| Servicio | Precio | Fuente |
|---|---|---|
| SES envío (sandbox) | **PENDING OFFICIAL CHECK** (generalmente ~$0.10/1,000 emails) | https://aws.amazon.com/ses/pricing/ |
| SQS mensajes (primeros 1M/mes gratis) | **PENDING OFFICIAL CHECK** | https://aws.amazon.com/sqs/pricing/ |
| EventBridge eventos (primeros 14M/mes gratis) | **PENDING OFFICIAL CHECK** | https://aws.amazon.com/eventbridge/pricing/ |
| S3 storage (primeros 5GB/mes gratis) | **PENDING OFFICIAL CHECK** | https://aws.amazon.com/s3/pricing/ |

### Fórmula de cálculo

```
Costo_S3 = (correos / 1,000) × precio_SES
         + max(0, mensajes_SQS − 1,000,000) × precio_SQS
         + max(0, eventos_EB − 14,000,000) × precio_EB
         + storage_S3_GB × precio_S3 × (horas / 720)
```

**INFERENCIA**: con los volúmenes estimados y las capas gratuitas de SQS y EventBridge,
el costo de S3 debería ser < USD 0.05. El ítem de mayor costo es SES.

### Campos post-ejecución

| Campo | Valor |
|---|---|
| Correos enviados | PENDING |
| MessageId(s) registrados | PENDING (sanitizados) |
| Mensajes SQS consumidos | PENDING |
| Costo real USD | PENDING |
| Margen restante | PENDING |
| Condición de parada activada | No / Sí — PENDING |

---

## S4 — Token Seguro (T13)

| Campo | Valor |
|---|---|
| Unidad de facturación | N/A — ejecución 100% local |
| Presupuesto límite | USD 0.00 |
| Costo real | USD 0.00 |
| Recursos AWS creados | 0 |
| Condición de parada aplicable | No aplica |

---

## Resumen del presupuesto

| Spike | Límite aprobado | Costo estimado | Costo real | Margen restante |
|---|---|---|---|---|
| S1 — Bedrock | USD 2.00 | PENDING OFFICIAL CHECK | PENDING | PENDING |
| S2 — Transcribe | USD 1.00 | PENDING OFFICIAL CHECK | PENDING | PENDING |
| S3 — SES/EB/SQS | USD 0.50 | PENDING OFFICIAL CHECK | PENDING | PENDING |
| S4 — Token (local) | USD 0.00 | USD 0.00 | USD 0.00 | USD 0.00 |
| **TOTAL** | **USD 3.50** | **PENDING** | **PENDING** | **PENDING** |

---

## Condiciones de parada por costo

| Condición | Acción |
|---|---|
| Costo estimado de S1 supera USD 2.00 antes de ejecutar | ABORT — no ejecutar T10 |
| Costo real de S1 supera USD 2.00 | STOP REQUIRED — no ejecutar T11 sin revisión humana |
| Costo acumulado (S1+S2) supera USD 3.00 | STOP REQUIRED — revisar presupuesto antes de T12 |
| Costo total supera USD 3.50 | STOP REQUIRED — cleanup inmediato |
| Cost Anomaly Detection activa alerta | STOP REQUIRED — verificar causa antes de continuar |

---

## Instrucciones de llenado post-ejecución

1. Después de T10: llenar campos reales de S1 usando `manifest-s1.md`.
2. Después de T11: llenar campos reales de S2 usando `manifest-s2.md`.
3. Después de T12: llenar campos reales de S3 usando `manifest-s3.md`.
4. Verificar que el total real no supera USD 3.50.
5. Documentar los precios oficiales consultados con fecha de consulta.
