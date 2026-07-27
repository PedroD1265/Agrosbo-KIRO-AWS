# Spike S2 Results — Transcribe Voz Agrícola

<!-- STATUS: TEMPLATE — CLOUD EXECUTION NOT PERFORMED -->
<!-- Rellenar este template durante / después de T11. -->
<!-- No renombrar a manifest-s2.md hasta que la ejecución esté completa. -->
<!-- No marcar ningún criterio como PASS sin evidencia de ejecución real. -->

---

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T11 |
| Spike | S2 — Transcribe Voz Agrícola |
| Commit base | [RELLENAR: git log -1 --oneline] |
| Fecha UTC | [RELLENAR: ISO 8601] |
| Región | [RELLENAR — determinada en T04] |
| Perfil AWS | agrosbo-role (o nombre exacto del spike role) |
| Presupuesto aprobado | USD [RELLENAR — confirmado en T05] |
| Presupuesto consumido | USD [RELLENAR post-ejecución] |
| STATUS | **TEMPLATE — CLOUD EXECUTION NOT PERFORMED** |

---

## Clips de audio

| Clip ID | Origen | Formato | Duración (s) | Sample rate (Hz) | Canales | Referencia ground truth |
|---|---|---|---|---|---|---|
| clip-001 | [Polly TTS / Grabación operador] | [FLAC/PCM/WAV] | [RELLENAR] | [RELLENAR] | [RELLENAR] | [frase exacta] |
| clip-002 | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] |
| clip-003 | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] |
| clip-004 | [RELLENAR o N/A] | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] |
| clip-005 | [RELLENAR o N/A] | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] | [RELLENAR] |

---

## Locale(s) probados

| Locale | Modo | Resultado general |
|---|---|---|
| [RELLENAR: ej. es-US] | Streaming (obligatorio) | [RELLENAR: WER promedio] |
| [RELLENAR: ej. es-ES] | Streaming o Batch | [RELLENAR] |
| es-MX (si disponible) | [RELLENAR] | [RELLENAR] |

---

## Resultados de Transcripción — Streaming (modo obligatorio)

### clip-001

| Campo | Valor |
|---|---|
| Locale | [RELLENAR] |
| Transcript (streaming, final) | [RELLENAR — texto observado] |
| Ground truth | [RELLENAR — texto de referencia] |
| WER | [RELLENAR] % |
| Substitutions | [RELLENAR] |
| Insertions | [RELLENAR] |
| Deletions | [RELLENAR] |
| Latencia primera palabra parcial | [RELLENAR] ms |
| Latencia transcripción final | [RELLENAR] ms |
| Job ID (sanitizado) | [primeros 8 chars]-...-[últimos 4 chars] |

### clip-002

| Campo | Valor |
|---|---|
| Transcript | [RELLENAR] |
| Ground truth | [RELLENAR] |
| WER | [RELLENAR] % |
| Latencia primera palabra parcial | [RELLENAR] ms |

<!-- Repetir estructura para clip-003 .. clip-005 -->

---

## Términos críticos — cobertura

| Término | En ground truth | Transcrito correctamente | Observación |
|---|---|---|---|
| riego | [Sí/No] | [Sí/No/RELLENAR] | |
| bloque | [Sí/No] | [Sí/No/RELLENAR] | |
| invernadero | [Sí/No] | [Sí/No/RELLENAR] | |
| fumigación | [Sí/No] | [Sí/No/RELLENAR] | |
| cosecha | [Sí/No] | [Sí/No/RELLENAR] | |
| fertilizante | [Sí/No] | [Sí/No/RELLENAR] | |
| poda | [Sí/No] | [Sí/No/RELLENAR] | |
| abono | [Sí/No] | [Sí/No/RELLENAR] | |

---

## Números y unidades — precisión

| Utterance con número | Ground truth | Transcrito | Correcto |
|---|---|---|---|
| [RELLENAR] | [RELLENAR] | [RELLENAR] | [Sí/No] |
| [RELLENAR] | [RELLENAR] | [RELLENAR] | [Sí/No] |

---

## Referencias temporales — precisión

| Utterance con fecha/tiempo | Ground truth | Transcrito | Correcto |
|---|---|---|---|
| [RELLENAR] | [RELLENAR] | [RELLENAR] | [Sí/No] |
| [RELLENAR] | [RELLENAR] | [RELLENAR] | [Sí/No] |

---

## Resultados de Transcripción — Batch (comparación/fallback)

| Campo | Valor |
|---|---|
| Ejecutado | Sí / No |
| Locale | [RELLENAR] |
| WER promedio (batch) | [RELLENAR] % |
| Latencia promedio por job | [RELLENAR] ms |
| WER promedio (sin custom vocabulary) | [RELLENAR] % |
| WER promedio (con custom vocabulary, si aplica) | [RELLENAR] % |
| Mejora con custom vocabulary | [RELLENAR] puntos porcentuales |

---

## Métricas agregadas

| Métrica | Streaming | Batch |
|---|---|---|
| WER promedio | [RELLENAR] % | [RELLENAR] % |
| WER mínimo (mejor clip) | [RELLENAR] % | [RELLENAR] % |
| WER máximo (peor clip) | [RELLENAR] % | [RELLENAR] % |
| Latencia primera palabra parcial p50 | [RELLENAR] ms | N/A |
| Latencia primera palabra parcial p95 | [RELLENAR] ms | N/A |
| Latencia transcripción final p50 | [RELLENAR] ms | [RELLENAR] ms |
| Latencia transcripción final p95 | [RELLENAR] ms | [RELLENAR] ms |
| Tasa de error (fallos de API) | [RELLENAR] % | [RELLENAR] % |

---

## Costo

| Campo | Valor |
|---|---|
| Duración total de audio transcrita (s) | [RELLENAR] |
| Precio streaming (USD/seg) | [RELLENAR — verificado en consola] |
| Precio batch (USD/seg) | [RELLENAR] |
| Costo streaming | USD [RELLENAR] |
| Costo batch | USD [RELLENAR] |
| Costo S3 temporal (bucket audio) | USD [RELLENAR] |
| Costo total S2 | USD [RELLENAR] |
| Dentro del presupuesto (USD 1.00) | Sí / No |

---

## S3 temporal (bucket de audio para batch)

| Campo | Valor |
|---|---|
| Nombre del bucket (sanitizado) | agrosbo-spike-audio-\<TS> |
| Objetos subidos | [RELLENAR] |
| Objetos eliminados post-spike | [RELLENAR] |
| Bucket eliminado | Sí / No — [RELLENAR] |

---

## Criterios PASS/FAIL (requirements.md §9, S2)

| Criterio | Resultado | Evidencia |
|---|---|---|
| Streaming funcional — conecta y emite parciales | [RELLENAR] | [ref a log] |
| Latencia streaming — primera palabra parcial < 2s | [RELLENAR] | [RELLENAR] ms |
| Transcripción final — texto reconocible en español | [RELLENAR] | [RELLENAR] |
| WER <= 30% en vocabulario agrícola sintético | [RELLENAR] | [RELLENAR] % |
| Custom vocabulary mejora WER vs baseline (si se probó) | [RELLENAR o N/A] | [RELLENAR] |
| Latencia batch < 30s para clip de 15s (fallback) | [RELLENAR o N/A] | [RELLENAR] |
| Idioma es-US o es-ES reconoce vocabulario agrícola | [RELLENAR] | [RELLENAR] |

**VEREDICTO**: [RELLENAR: PASS / APPROVED_WITH_LIMITATIONS / PARTIAL / FAIL]

> Nota: resultado exclusivamente batch sin streaming = APPROVED_WITH_LIMITATIONS, no PASS.

---

## Errores

| Error | Mensaje (sanitizado) | Resolución |
|---|---|---|
| [RELLENAR o N/A] | [RELLENAR] | [RELLENAR] |

---

## Logs sanitizados

```
[RELLENAR: extractos relevantes sin credenciales, account IDs, ARNs]
[Job IDs: mostrar solo primeros 8 + últimos 4 chars]
[Bucket names: reemplazar con agrosbo-spike-audio-<TS>]
[Conservar: locales, latencias, WER, error codes]
```

---

## Observaciones sobre sesgo de evaluación

- Origen de los clips: [Polly TTS / Grabación humana]
- Si clips son TTS (Polly): el WER puede subestimar la dificultad real con voz humana.
  Esto se documenta como limitación para Spec 23.
- Accento de los clips: [RELLENAR: es-US Lupe / es-ES / grabación operador]

---

## Decisiones para Spec 23 (informativas)

- Locale recomendado: [RELLENAR]
- Custom vocabulary: [Mejora / No mejora / No probado]
- WER observado con clips sintéticos: [RELLENAR] %
- WER esperado con voz humana: no determinado (Spec 23)
- Streaming viable para producción: [Sí / No / Condicionalmente]

---

## Cleanup S2

```
[ ] Transcription jobs eliminados: confirmado
[ ] Objetos S3 eliminados: confirmado
[ ] Bucket S3 eliminado: confirmado
[ ] Custom vocabulary eliminado (si aplica): confirmado
```

---

<!-- FIN DEL TEMPLATE — renombrar a manifest-s2.md al completar con evidencia real -->
