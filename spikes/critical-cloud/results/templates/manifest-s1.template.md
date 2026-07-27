# Spike S1 Results — Bedrock Tool Calling

<!-- STATUS: TEMPLATE — CLOUD EXECUTION NOT PERFORMED -->
<!-- Rellenar este template durante / después de T10. -->
<!-- No renombrar a manifest-s1.md hasta que la ejecución esté completa. -->
<!-- No marcar ningún criterio como PASS sin evidencia de ejecución real. -->

---

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T10 |
| Spike | S1 — Bedrock Tool Calling |
| Commit base | [RELLENAR: git log -1 --oneline] |
| Fecha UTC | [RELLENAR: ISO 8601] |
| Región | [RELLENAR — determinada en T04] |
| Perfil AWS | agrosbo-role (o nombre exacto del spike role) |
| Modelo | [RELLENAR: ID exacto, ej. amazon.nova-lite-v1:0] |
| Presupuesto aprobado | USD [RELLENAR — confirmado en T05] |
| Presupuesto consumido | USD [RELLENAR post-ejecución] |
| Recursos AWS creados | 0 (Bedrock no crea recursos persistentes) |
| STATUS | **TEMPLATE — CLOUD EXECUTION NOT PERFORMED** |

---

## Request ID

| Campo | Valor |
|---|---|
| Request ID (sanitizado) | [RELLENAR: primeros 8 chars]-...-[últimos 4 chars] |
| Número de invocaciones realizadas | [RELLENAR] |

---

## Herramienta solicitada y argumentos

### Invocación 1

| Campo | Valor |
|---|---|
| Herramienta solicitada por el modelo | [RELLENAR: ej. `get_inventory`] |
| Argumentos devueltos por el modelo | `{ "item_name": "[RELLENAR]" }` |
| Tool result enviado | `{ "quantity": "[RELLENAR]", "unit": "[RELLENAR]", "location": "[RELLENAR]" }` (datos del fixture) |

### Invocación 2 (si aplica — re-invocación con tool_result)

| Campo | Valor |
|---|---|
| Respuesta final del modelo | [RELLENAR: texto de la respuesta compuesta] |
| Contiene dato del fixture | Sí / No — [RELLENAR] |
| Alucina datos no provistos | Sí / No — [RELLENAR] |

---

## Validación contra fixture

| Aspecto | Esperado | Observado | PASS/FAIL |
|---|---|---|---|
| Nombre de herramienta en tool_use | [RELLENAR fixture] | [RELLENAR] | [RELLENAR] |
| Parámetro clave en arguments | [RELLENAR] | [RELLENAR] | [RELLENAR] |
| Dato del fixture en respuesta final | [RELLENAR] | [RELLENAR] | [RELLENAR] |
| Sin alucinaciones en respuesta final | Sin datos inventados | [RELLENAR] | [RELLENAR] |

---

## Métricas

| Métrica | Valor |
|---|---|
| Latencia primera respuesta (tool_use) | [RELLENAR] ms |
| Latencia respuesta final (post tool_result) | [RELLENAR] ms |
| Latencia total (end-to-end) | [RELLENAR] ms |
| Tokens de entrada — invocación 1 | [RELLENAR] |
| Tokens de salida — invocación 1 | [RELLENAR] |
| Tokens de entrada — invocación 2 | [RELLENAR] |
| Tokens de salida — invocación 2 | [RELLENAR] |
| Tokens totales | [RELLENAR] |
| Reintentos realizados | [RELLENAR] (0 si ninguno) |
| Tasa de error | [RELLENAR] % |
| p50 latencia (si múltiples rondas) | [RELLENAR] ms |
| p95 latencia (si múltiples rondas) | [RELLENAR] ms |

---

## Costo

| Campo | Valor |
|---|---|
| Precio input USD/1M tokens | [RELLENAR — verificado en consola AWS] |
| Precio output USD/1M tokens | [RELLENAR] |
| Costo calculado | USD [RELLENAR] |
| Costo real (si AWS Cost Explorer disponible) | USD [RELLENAR] o "ESTIMATED" |
| Dentro del presupuesto (USD 2.00) | Sí / No |

---

## Criterios PASS/FAIL (requirements.md §9, S1)

| Criterio | Resultado | Evidencia |
|---|---|---|
| Invocación de modelo — respuesta válida recibida | [RELLENAR] | [ref a log sanitizado] |
| Tool use — modelo emite tool_use con nombre y parámetros correctos | [RELLENAR] | [ref] |
| Composición — modelo integra tool_result en respuesta final | [RELLENAR] | [ref] |
| Latencia — respuesta completa < 10s (cold) | [RELLENAR] | [RELLENAR] ms |
| Costo — dentro del budget aprobado | [RELLENAR] | USD [RELLENAR] |

**VEREDICTO**: [RELLENAR: PASS / PARTIAL / FAIL]

---

## Errores

| Error | Mensaje (sanitizado) | Resolución |
|---|---|---|
| [RELLENAR o N/A] | [RELLENAR] | [RELLENAR] |

---

## Logs sanitizados

```
[RELLENAR: extractos relevantes sin credenciales, account IDs, ARNs, ni session tokens]
[Reemplazar account IDs con <ACCOUNT_ID>]
[Reemplazar ARNs con arn:aws:bedrock:<REGION>:<ACCOUNT_ID>:...]
[Conservar: model IDs, error codes, latencias, tokens]
```

---

## Datos sanitizados

- Sin datos de usuarios reales.
- Sin credenciales AWS.
- Sin account IDs.
- Sin ARNs completos.
- Sin session tokens.
- Correos electrónicos: N/A para S1.
- IDs de tareas / inventario: sintéticos del fixture.

---

## Decisiones para Spec 21 (informativas, no vinculantes)

- Modelo utilizado: [RELLENAR]
- Latencia observada: [RELLENAR] ms
- Costo por operación: USD [RELLENAR]
- Limitaciones observadas: [RELLENAR o N/A]
- Apto para P0 tool calling: Sí / No / Condicionalmente — [RELLENAR]

---

## Cleanup de S1

```
[ ] Bedrock: sin recursos persistentes creados — confirmado
[ ] CloudWatch log groups (si aplica): eliminados — confirmado
```

---

<!-- FIN DEL TEMPLATE — renombrar a manifest-s1.md al completar con evidencia real -->
