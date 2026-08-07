# Microvalidación M1 — Amazon Polly

## Estado

| Campo | Valor |
|---|---|
| Tarea | T15 |
| Tipo | Documental; sin ejecución nueva durante el cierre |
| Cierre | 2026-07-28 |
| Región observada | `us-east-1` |
| Resultado | **COMPLETED — VERIFIED_IN_SPIKE para fixtures; NOT_IMPLEMENTED en producción** |
| Decisión productiva | Diferida a Spec 23 |

Fuentes oficiales:

- [Voces disponibles](https://docs.aws.amazon.com/polly/latest/dg/available-voices.html)
- [API SynthesizeSpeech](https://docs.aws.amazon.com/polly/latest/APIReference/API_SynthesizeSpeech.html)
- [Precios de Amazon Polly](https://aws.amazon.com/polly/pricing/)

La ejecución S2 ya registrada usó Polly Neural, voz Lupe (`es-US`), para crear
los tres clips PCM. Esta microvalidación no realizó nuevas síntesis.

## Voces españolas verificadas en `us-east-1`

Una consulta read-only `describe-voices` del 2026-07-28 confirmó:

| Idioma | Standard | Neural | Long-form | Generative |
|---|---|---|---|---|
| `es-US` | Lupe, Penelope, Miguel | Lupe, Pedro | — | Lupe, Pedro |
| `es-ES` | Lucia, Enrique, Conchita | Lucia, Sergio | Alba, Raul | Lucia, Sergio |
| `es-MX` | Mia | Mia, Andres | — | Mia, Andres |

La disponibilidad de una voz depende del engine y la región. Spec 23 debe
repetir `describe-voices` antes de elegir una voz productiva.

## Formatos y sample rates

`SynthesizeSpeech` documenta los siguientes formatos:

| Formato | Tipo | Sample rates documentados |
|---|---|---|
| `mp3` | Audio comprimido | 8, 16, 22.05, 24, 44.1 y 48 kHz |
| `ogg_vorbis` | Audio comprimido | 8, 16, 22.05, 24, 44.1 y 48 kHz |
| `ogg_opus` | Audio comprimido | 48 kHz |
| `pcm` | PCM mono, signed 16-bit little-endian | 8 y 16 kHz |
| `mulaw` / `alaw` | Audio telefónico | 8 kHz |
| `json` | Speech marks; no contiene audio | N/A |

Para S2 se verificó `pcm` a 16 kHz, compatible con Transcribe Streaming. Polly
no produce FLAC directamente.

## Sesgo Polly → Transcribe

| Riesgo | Evaluación |
|---|---|
| Pronunciación sintética limpia | ALTO — puede reducir artificialmente el WER |
| Ausencia de ruido, viento y maquinaria | ALTO |
| Acento distinto al operador real | MEDIO |
| Posible circularidad entre servicios AWS de voz | DESCONOCIDO — no asumir modelos compartidos |

El WER de S2 (18.1% promedio) es evidencia del harness, no una estimación de
producción. Spec 23 debe medir voz humana, ruido real y acentos de campo.

## Precios y Billing

Los precios exactos no se capturaron de forma reproducible durante el cierre:
**NEEDS_OFFICIAL_VERIFICATION**. El importe final de Spec 17 permanece
**PENDING_HUMAN_BILLING_CONFIRMATION** bajo waiver explícito.

No se interpreta el costo pendiente como USD 0.00 y no se extrapola un precio
productivo desde los tres clips.

## Decisión

Polly fue viable para generar fixtures sintéticos de S2 y queda
**VERIFIED_IN_SPIKE** únicamente para ese uso. Integración, elección de engine,
voz, latencia, experiencia hablada y costo productivos están
**NOT_IMPLEMENTED** y se difieren a Spec 23.
