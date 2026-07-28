# Spike S2 Results — Transcribe Voz Agricola

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T11 |
| Spike | S2 — Transcribe Voz Agricola |
| Commit base | 156036a |
| Fecha UTC | 2026-07-28 |
| Region | us-east-1 |
| Perfil AWS | agrosbo-role (assumed-role/AgrosboDeveloperRole/agrosbo-local) |
| Locale | es-US |
| Presupuesto aprobado | USD 1.00 |
| Presupuesto consumido | ESTIMATED < USD 0.05 (ver seccion Costo) |
| Recursos AWS creados | 0 (streaming no crea recursos persistentes) |
| Exit code | 0 |
| STATUS | **PASS** |

---

## Configuracion tecnica

| Campo | Valor |
|---|---|
| Modo | Streaming (StartStreamTranscription) |
| Formato audio | PCM raw signed 16-bit little-endian |
| Sample rate | 16000 Hz |
| Canales | 1 (mono) |
| Chunk duration | 100 ms (3200 bytes por chunk) |
| Pacing | ~100 ms entre chunks |
| Cabecera WAV | No (raw PCM) |
| Timeout | 30000 ms |
| SDK | @aws-sdk/client-transcribe-streaming |
| Generacion de clips | Amazon Polly Neural, voz Lupe (es-US) |

---

## Clips de audio

| Clip | Archivo | Tamano (bytes) | Duracion estimada |
|---|---|---|---|
| LIVE-01 | clip-001.pcm | 127600 | ~3.99s |
| LIVE-02 | clip-002.pcm | 115600 | ~3.61s |
| LIVE-03 | clip-003.pcm | 160800 | ~5.03s |

---

## Resultados live por clip

### LIVE-01

| Campo | Valor |
|---|---|
| Archivo | clip-001.pcm |
| WER | **7.7%** |
| Latencia | 4552 ms |
| Ground truth | Programar riego del bloque norte para mañana a las seis de la mañana |
| Transcript observado | Programar riego del bloque norte para mañana a las 6:00 de la mañana. |
| Substitutions | 1 (seis -> 6:00) |
| Deletions | 0 |
| Insertions | 0 |
| Observacion | Transcribe convierte numeros hablados a digitos. Esperado para STT. |
| Veredicto | **PASS** (WER <= 30%) |

### LIVE-02

| Campo | Valor |
|---|---|
| Archivo | clip-002.pcm |
| WER | **20.0%** |
| Latencia | 4171 ms |
| Ground truth | Quedan ciento cincuenta kilos de fertilizante en la bodega principal |
| Transcript observado | Quedan 150 kilos de fertilizante en la bodega principal. |
| Substitutions | 2 (ciento cincuenta -> 150) |
| Deletions | 0 |
| Insertions | 0 |
| Observacion | Numeros hablados transcritos como digitos. El significado se preserva. |
| Veredicto | **PASS** (WER <= 30%) |

### LIVE-03

| Campo | Valor |
|---|---|
| Archivo | clip-003.pcm |
| WER | **26.7%** |
| Latencia | 5692 ms |
| Ground truth | Registrar cosecha de dos mil quinientos kilos de tomate en el bloque sur, lote dos |
| Transcript observado | Registrar cosecha de 2500 kilos de tomate en el bloque sur, lote 2. |
| Substitutions | 4 (dos mil quinientos -> 2500, dos -> 2) |
| Deletions | 0 |
| Insertions | 0 |
| Observacion | Patron consistente: numeros hablados -> digitos. Vocabulario agricola preservado. |
| Veredicto | **PASS** (WER <= 30%) |

---

## Metricas agregadas — LIVE (solo LIVE-01, LIVE-02, LIVE-03)

| Metrica | Valor |
|---|---|
| Clips evaluados | 3 |
| WER promedio live | **18.1%** |
| WER minimo | 7.7% (LIVE-01) |
| WER maximo | 26.7% (LIVE-03) |
| Latencia promedio | 4805 ms |
| Latencia minima | 4171 ms |
| Latencia maxima | 5692 ms |
| Clips PASS (WER <= 30%) | 3/3 |
| Criterio cumplido | Si |

Nota: el valor Avg WER 9.3% mostrado en stdout corresponde a pruebas mock
locales (TX-09..TX-17) y NO representa el rendimiento real de Transcribe.

---

## Observaciones sobre WER

La principal fuente de WER en los tres clips es la conversion de numeros
hablados (ej. "ciento cincuenta") a representacion digital ("150") por
Transcribe. Esto es comportamiento estandar del servicio, no un error de
reconocimiento.

Si se aplicara normalizacion de numeros (mapear digitos a palabras o
viceversa), el WER real seria cercano a 0% en los tres clips. Sin embargo,
la politica documentada en `text-normalizer.ts` es NO aplicar esa
normalizacion para no ocultar diferencias.

Para produccion (Spec 23), el pipeline deberia incluir un paso de
normalizacion numerica post-STT.

---

## Sesgo TTS documentado

Los clips fueron generados con Amazon Polly Neural (es-US, Lupe). Esto
introduce sesgo positivo:

- Pronunciacion perfecta sin hesitaciones
- Sin ruido de fondo
- Sin acento regional del operador

El WER observado (18.1% promedio) es probablemente optimista respecto a
condiciones reales de campo. La evaluacion definitiva con voz humana
corresponde a Spec 23.

---

## Costo

| Campo | Valor |
|---|---|
| Duracion total de audio | ~12.63 segundos |
| Modo | Streaming |
| Precio streaming | NEEDS_OFFICIAL_VERIFICATION |
| Costo estimado | < USD 0.05 (basado en estructura de precios por segundo) |
| Costo real confirmado | PENDING AWS BILLING VERIFICATION |
| Dentro del presupuesto (USD 1.00) | Si (estimacion) |

---

## Resultados del harness completo

| Seccion | Casos | PASS |
|---|---|---|
| WAV Validation | 8 | 8 |
| Transcription & Metrics (mock) | 13 | 13 |
| Streaming Client | 16 | 16 |
| Infrastructure | 3 | 3 |
| Live Transcription | 3 | 3 |
| **Total** | **43** | **43** |

---

## Criterios PASS/FAIL (requirements.md S2)

| Criterio | Resultado | Evidencia |
|---|---|---|
| Streaming funcional — conecta y emite parciales | **PASS** | 3 clips transcritos exitosamente |
| Transcripcion final — texto reconocible en espanol | **PASS** | Vocabulario agricola preservado en los 3 clips |
| WER <= 30% en vocabulario agricola | **PASS** | 7.7%, 20.0%, 26.7% (todos <= 30%) |
| Latencia aceptable | **PASS** | 4.2-5.7s para clips de 3.6-5.0s (streaming overhead ~1s) |
| Locale es-US funcional | **PASS** | Transcript coherente en espanol |

---

## Cleanup S2

```
[x] Streaming: sin recursos persistentes — confirmado
    (StartStreamTranscription no crea jobs, buckets ni vocabularios)
[x] Sin transcription jobs creados
[x] Sin buckets S3 creados
[x] Sin custom vocabulary creado
```

---

## Decisiones para Spec 23 (informativas, no vinculantes)

- Locale evaluado: es-US (unico candidato probado en live)
- es-ES: no evaluado en live (candidato para Spec 23)
- Custom vocabulary: no probado (candidato para Spec 23)
- Normalizacion numerica: recomendada para produccion
- WER con voz humana: no determinado (Spec 23)
- Streaming viable para push-to-talk: si (latencia < 6s para clips cortos)

---

## Veredicto

**PASS**

- 3/3 clips live cumplen WER <= 30%
- Streaming funcional con exit code 0
- Vocabulario agricola reconocido correctamente
- Numeros convertidos a digitos (comportamiento esperado de STT)
- Auth, IAM y conectividad funcionales
