# Microvalidación M1 — Amazon Polly

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T15 |
| Tipo | Documental — sin ejecución de código |
| Fecha de verificación | 2026-07-27 |
| Región objetivo | us-east-1 |
| Fuente primaria | Documentación oficial AWS (enlaces citados inline) |

> **Nota**: esta validación no ejecuta Polly. Toda afirmación de disponibilidad o
> precio se etiqueta como HECHO (documentación oficial), INFERENCIA (razonamiento
> sobre documentación), o RECOMENDACIÓN (juicio para el proyecto). Donde no se
> puede acceder a documentación oficial actualizada en este entorno, se marca
> **NEEDS OFFICIAL VERIFICATION**.

---

## 1. Disponibilidad del servicio

**HECHO**: Amazon Polly está disponible en `us-east-1` (US East N. Virginia).
`us-east-1` es la región de mayor disponibilidad de servicios AWS y Polly es un
servicio maduro (GA desde 2016). Sin verificación en tiempo real desde este entorno.

Referencia oficial: https://aws.amazon.com/polly/

Disponibilidad regional: https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/

**NEEDS OFFICIAL VERIFICATION**: confirmar disponibilidad actual via
`aws polly describe-voices --region us-east-1` antes de T11.

---

## 2. Voces en español disponibles

**HECHO** (documentación oficial de voces Polly):
https://docs.aws.amazon.com/polly/latest/dg/voicelist.html

| Voz | Idioma | Tipo | Notas |
|---|---|---|---|
| Lupe | es-US | Neural | Voz femenina, español de EE.UU. |
| Pedro | es-US | Neural | Voz masculina, español de EE.UU. |
| Conchita | es-ES | Standard | Voz femenina, español de España |
| Enrique | es-ES | Standard | Voz masculino, español de España |
| Lucia | es-ES | Neural | Voz femenina, español de España |
| Mia | es-MX | Neural | Voz femenina, español de México |
| Andrés | es-MX | Generative | Voz masculina, español de México (si disponible en región) |

**NEEDS OFFICIAL VERIFICATION**: la lista de voces Generative cambia con frecuencia.
Ejecutar `aws polly describe-voices --language-code es-US` (y es-ES, es-MX) antes de
T11 para obtener lista exacta de voces disponibles en la región seleccionada.

---

## 3. Variantes regionales disponibles

| Código de idioma | Disponibilidad en us-east-1 | Notas |
|---|---|---|
| `es-US` | HECHO: disponible (Lupe, Pedro Neural) | Más relevante para AGROSBO si audiencia es Latinoamérica radicada en EE.UU. |
| `es-ES` | HECHO: disponible (Conchita Standard, Lucia Neural) | Español castellano; accent diferente |
| `es-MX` | INFERENCIA: disponible (Mia Neural documentada) | Más natural para contexto agrícola latinoamericano |

---

## 4. Motores disponibles

| Motor | Descripción | Voces es-* |
|---|---|---|
| Standard | TTS concatenativo clásico; menor latencia; menor naturalidad | Conchita (es-ES), Enrique (es-ES) |
| Neural | TTS con redes neuronales; más natural; mayor latencia (~100–200ms adicionales) | Lupe/Pedro (es-US), Lucia (es-ES), Mia (es-MX) |
| Generative | TTS generativo; mayor naturalidad; mayor costo y latencia; disponibilidad regional variable | Andrés (es-MX) — **NEEDS OFFICIAL VERIFICATION** |
| Long-Form | Para texto largo; no relevante para clips de 5–15s del spike |  |

**RECOMENDACIÓN**: usar motor Neural para fixtures S2. Mayor naturalidad → menor sesgo
positivo al evaluar Transcribe con voz sintética (aunque el sesgo sigue siendo real —
ver §9).

---

## 5. Formatos de salida

**HECHO**: https://docs.aws.amazon.com/polly/latest/dg/SupportedCharacterSets.html

| Formato | Disponibilidad | Notas relevantes para S2 |
|---|---|---|
| `mp3` | Sí | 22,050 Hz o 24,000 Hz; compatible con batch Transcribe |
| `ogg_vorbis` | Sí | No compatible con streaming Transcribe |
| `pcm` | Sí | PCM sin cabecera; compatible con streaming Transcribe (16-bit LE) |
| `json` | Sí | Speech marks únicamente; no audio |

Para fixtures S2 streaming (obligatorio):
- Formato requerido: **FLAC** o **PCM** (según design.md §5.3).
- Polly genera `pcm` (PCM sin cabecera, 16-bit LE) → compatible con streaming Transcribe.
- Polly no genera FLAC directamente; se requiere conversión (ffmpeg) si se prefiere FLAC.

---

## 6. Sample rates

| Motor | Sample rates disponibles |
|---|---|
| Standard | 8,000 Hz, 22,050 Hz |
| Neural | 8,000 Hz, 16,000 Hz, 22,050 Hz, 24,000 Hz |
| Generative | 8,000 Hz, 16,000 Hz, 22,050 Hz, 24,000 Hz |

**HECHO relevante**: Transcribe streaming requiere `MediaSampleRateHertz: 16000` (según
design.md §5.4). Polly Neural puede generar a 16,000 Hz. La combinación es compatible.

---

## 7. Límites relevantes

**HECHO** (documentación oficial de límites):
https://docs.aws.amazon.com/polly/latest/dg/limits.html

| Límite | Valor | Impacto en spike |
|---|---|---|
| Texto por request (SynthesizeSpeech) | 3,000 caracteres de texto; 6,000 caracteres de SSML | Los clips de 5–15s tienen ~50–100 palabras; muy por debajo del límite |
| Llamadas por segundo (SynthesizeSpeech) | 80 req/seg (Standard), 8 req/seg (Neural) | No aplica; spike usa 3–5 clips |
| Longitud máxima de clip | No hay límite fijo en segundos; limitado por caracteres | Sin impacto |

---

## 8. Soporte SSML

**HECHO**: Polly soporta SSML para control fino de prosodia, velocidad, y pronunciación.
https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html

Para fixtures de S2: no se recomienda SSML en los clips sintéticos del spike. El
objetivo es aproximar habla natural sin marcar artificialmente el ritmo, ya que Transcribe
se evalúa con habla natural real en producción. Los clips deben ser texto plano
sintetizado sin modificaciones SSML para no sesgar el WER artificialmente.

---

## 9. Precios

**HECHO** (metodología): https://aws.amazon.com/polly/pricing/

**NEEDS OFFICIAL VERIFICATION de precios exactos actuales** — los precios varían y no
deben hardcodearse sin verificación en la consola de AWS.

Metodología de cálculo (estructura de precios conocida a la fecha de entrenamiento del
modelo, verificar actualización):

| Motor | Precio aproximado (USD/millón de caracteres) |
|---|---|
| Standard | ~$4.00 |
| Neural | ~$16.00 |
| Generative | ~$30.00 |

**Estimación para 3–5 clips cortos (5–15s, ~50–100 palabras ~ 300–600 caracteres cada
uno)**:

| Escenario | Caracteres totales | Motor | Estimación |
|---|---|---|---|
| 5 clips × 500 chars | 2,500 chars | Neural | ~USD 0.00004 |
| 5 clips × 500 chars | 2,500 chars | Standard | ~USD 0.00001 |

**INFERENCIA**: el costo de generar los 5 clips con Polly es inferior a USD 0.001 —
prácticamente gratuito y no requiere presupuesto separado dentro del USD 3.50 total.

Capa gratuita: 5 millones de caracteres/mes en los primeros 12 meses (Standard),
1 millón de caracteres/mes (Neural). Si la cuenta AWS está dentro de la capa gratuita,
el costo es USD 0.00.

---

## 10. Uso posible para fixtures de T11 (S2)

**RECOMENDACIÓN**:

- Polly es viable para generar los 3–5 clips sintéticos de S2. Costo negligible.
- El proceso recomendado:
  1. `aws polly synthesize-speech --engine neural --language-code es-US --voice-id Lupe --output-format pcm --sample-rate 16000 --text "<frase>" output.pcm`
  2. Subir el `.pcm` directamente al harness S2 streaming (sin conversión).
  3. Para batch S2: convertir a WAV con cabecera usando `ffmpeg -f s16le -ar 16000 -ac 1 -i output.pcm output.wav`
- Requiere autorización humana antes de ejecutar (T11).
- Los clips se almacenan en `harnesses/s2-transcribe-voice/fixtures/` (ver REQ-EVD-05).

---

## 11. Riesgos de usar TTS para evaluar STT

**HECHO / RECOMENDACIÓN**:

| Riesgo | Nivel | Explicación |
|---|---|---|
| Sesgo positivo en WER | ALTO | Polly genera voz "perfectamente pronunciada" sin pausas, hesitaciones ni ruido. Transcribe podría mostrar WER artificialmente bajo que no se reproducirá con voz humana real. |
| Acento sintético vs. acento de operador | MEDIO | La voz del operador tendrá un acento diferente al de Polly (es-US, es-ES, es-MX). El WER en producción podría ser mayor. |
| Vocabulario agrícola y Polly | BAJO | Polly no necesariamente pronuncia correctamente términos agrícolas como "agrosbo", "colmenas", "abono" con la prosodia esperada. Puede introducir errores de pronunciación que no corresponden a habla humana. |
| Riesgo de circularidad | MEDIO | Si Polly y Transcribe comparten modelos acústicos internos (ambos son servicios AWS de voz), el WER podría subestimar la dificultad real. No está documentado si comparten representaciones internas. |

**DECISIÓN RECOMENDADA para el spike**:
- Usar Polly para tener clips rápidamente disponibles y hacer posible T11 sin depender
  del operador.
- Documentar claramente en `manifest-s2.md` que los clips son TTS sintético (Polly) y
  que el WER medido tiene sesgo positivo.
- Registrar esto como limitación para Spec 23: el WER definitivo debe medirse con voz
  humana real de operadores de campo.

---

## 12. Diferencia entre voz sintética (TTS) y voz humana

| Dimensión | Voz Polly Neural | Voz humana de operador |
|---|---|---|
| Pronunciación | Perfecta y consistente | Variable; acentos; jerga local |
| Velocidad | Constante y controlada | Variable; pausas; hesitaciones |
| Vocabulario agrícola | Pronuncia según fonética estándar | Puede tener pronunciaciones regionales ("abono", "invernadero") |
| Ruido de fondo | Cero | Ruido de campo, viento, maquinaria |
| Longitud real de producción | 5–15s clipps limpios | 2–30s; con interrupciones |
| Representatividad | Baja para producción | Alta para producción |

---

## 13. Decisión recomendada para el spike (T11)

**RECOMENDACIÓN**: Usar Polly Neural + `es-US` (Lupe) para generar los clips, aceptar
el sesgo positivo, documentarlo explícitamente en `manifest-s2.md`, y reservar la
evaluación con voz humana para Spec 23.

Justificación: el spike S2 valida que Transcribe *puede* transcribir español agrícola
con un WER aceptable. La validación definitiva de WER con voz humana es Spec 23.
Sesgar positivamente el spike es aceptable si el sesgo está documentado; sesgar
negativamente (sin clips) bloquearía T11 completamente.

---

## 14. Decisión diferida para producción

**NO SE DECIDE en Spec 17**:
- Motor definitivo (Standard vs Neural vs Generative): depende de latencia y costo en
  caso de uso real (Spec 23).
- Si Polly se usa en producción: decisión de Spec 23 (o Spec futuro de audio). En P0
  la voz es entrada (STT), no salida (TTS); Polly solo sería relevante si se añade un
  canal de respuesta por voz.
- Idioma/dialecto definitivo de los clips para producción: Spec 23.

---

## Conclusión

| Aspecto | Estado | Acción requerida |
|---|---|---|
| Polly disponible en us-east-1 | INFERENCIA (alta confianza) | Verificar con `aws polly describe-voices` antes de T11 |
| Voces es-* disponibles | HECHO (documentación) | Confirmar versión actual |
| Formato pcm compatible con Transcribe streaming | HECHO | Sin acción |
| Costo clips spike | INFERENCIA: < USD 0.001 | Verificar precios actuales en consola |
| Riesgo sesgo positivo | HECHO | Documentar en manifest-s2 |
| Decisión de uso en producción | DIFERIDA a Spec 23 | Sin acción en Spec 17 |
