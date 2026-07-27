# Spike S3 Results — SES Eventos Verificables

<!-- STATUS: TEMPLATE — CLOUD EXECUTION NOT PERFORMED -->
<!-- Rellenar este template durante / después de T12. -->
<!-- No renombrar a manifest-s3.md hasta que la ejecución esté completa. -->
<!-- No marcar ningún criterio como PASS sin evidencia de ejecución real. -->

---

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T12 |
| Spike | S3 — SES Eventos Verificables |
| Commit base | [RELLENAR: git log -1 --oneline] |
| Fecha UTC | [RELLENAR: ISO 8601] |
| Región | [RELLENAR — determinada en T04] |
| Perfil AWS | agrosbo-role (o nombre exacto del spike role) |
| Presupuesto aprobado | USD [RELLENAR — confirmado en T05] |
| Presupuesto consumido | USD [RELLENAR post-ejecución] |
| STATUS | **TEMPLATE — CLOUD EXECUTION NOT PERFORMED** |

---

## Configuración del spike

| Campo | Valor |
|---|---|
| Remitente (sanitizado) | operator@example.com |
| Destinatario Delivery | success@simulator.amazonses.com (SES Mailbox Simulator) |
| Destinatario Bounce | bounce@simulator.amazonses.com (SES Mailbox Simulator) |
| SES sandbox activo | Sí / No — [RELLENAR] |
| Configuration set | agrosbo-spike-config-\<TS> |
| Event destination | agrosbo-spike-eventbridge-\<TS> |
| EventBridge rule | agrosbo-spike-ses-rule-\<TS> |
| SQS queue | agrosbo-spike-ses-events-\<TS> |
| Run ID (UUID generado) | [RELLENAR: primeros 8 chars]-... |

---

## Infraestructura creada (pre-envío)

| Recurso | ARN (sanitizado) | Estado |
|---|---|---|
| SQS queue | arn:aws:sqs:\<REGION>:\<ACCOUNT_ID>:agrosbo-spike-ses-events-\<TS> | [RELLENAR: CREATED/FAILED] |
| SES configuration set | N/A (nombre only) | [RELLENAR] |
| EventBridge rule | arn:aws:events:\<REGION>:\<ACCOUNT_ID>:rule/agrosbo-spike-ses-rule-\<TS> | [RELLENAR] |
| SQS queue policy | Inline en SQS | [RELLENAR: CONFIGURED/FAILED] |

---

## Envíos realizados

### Envío 1 — Delivery test

| Campo | Valor |
|---|---|
| Tipo | Delivery — destinatario success@simulator.amazonses.com |
| MessageId (sanitizado) | [primeros 8 chars]-...-[últimos 4 chars] |
| ConfigurationSetName | agrosbo-spike-config-\<TS> |
| Tags en el envío | spike=s3, run-id=\<UUID> |
| SES acepta el envío (exit 0) | Sí / No — [RELLENAR] |

### Envío 2 — Bounce test

| Campo | Valor |
|---|---|
| Tipo | Bounce — destinatario bounce@simulator.amazonses.com |
| MessageId (sanitizado) | [primeros 8 chars]-...-[últimos 4 chars] |
| SES acepta el envío (exit 0) | Sí / No — [RELLENAR] |

---

## Eventos recibidos en SQS

### Evento 1

| Campo | Valor |
|---|---|
| Tipo de evento (eventType) | [RELLENAR: Delivery / Bounce / Complaint] |
| detail-type (EventBridge) | [RELLENAR: "Email Sending Events"] |
| source | [RELLENAR: "aws.ses"] |
| mail.messageId (del evento, sanitizado) | [primeros 8 chars]-...-[últimos 4 chars] |
| Correlación con MessageId de SendEmail | [RELLENAR: MATCH / MISMATCH] |
| Latencia envío → evento recibido | [RELLENAR] ms (o seg) |
| Mensaje SQS eliminado post-procesamiento | Sí / No — [RELLENAR] |

### Evento 2 (Bounce, si aplica)

| Campo | Valor |
|---|---|
| Tipo de evento | [RELLENAR] |
| mail.messageId correlacionado | [RELLENAR: MATCH / MISMATCH] |
| Latencia | [RELLENAR] ms |

---

## Pruebas de resiliencia

### Deduplicación

| Campo | Valor |
|---|---|
| Evento duplicado enviado al procesador en memoria | Sí / No — [RELLENAR] |
| Estado duplicado (el store actualizó dos veces) | [RELLENAR: Sí (FAIL) / No (PASS)] |
| Veredicto | [PASS / FAIL] |
| Evidencia | [RELLENAR] |

### Tolerancia a orden de eventos

| Campo | Valor |
|---|---|
| Se simuló llegada de `opened_link` antes de `delivered` | Sí / No — [RELLENAR] |
| El procesador toleró el orden incorrecto sin crash | [RELLENAR: Sí (PASS) / No (FAIL)] |
| Estado final correcto tras reordenamiento | Sí / No — [RELLENAR] |
| Veredicto | [PASS / FAIL] |

### Eventos retrasados

| Campo | Valor |
|---|---|
| Evento tardío procesado | Sí / No — [RELLENAR] |
| Estado principal retrocedió (FAIL) | Sí / No — [RELLENAR] |
| Veredicto | [PASS / FAIL] |

---

## Métricas

| Métrica | Valor |
|---|---|
| Latencia envío → Delivery p50 | [RELLENAR] ms |
| Latencia envío → Delivery p95 | [RELLENAR] ms |
| Latencia envío → Bounce p50 | [RELLENAR] ms |
| Latencia envío → Bounce p95 | [RELLENAR] ms |
| Correlación MessageId | [RELLENAR] / [RELLENAR total] MATCH |
| Deduplicación | PASS / FAIL |
| Tolerancia a orden | PASS / FAIL |
| Tasa de error (errores de API) | [RELLENAR] % |

---

## Costo

| Campo | Valor |
|---|---|
| Correos enviados (SES) | [RELLENAR] |
| Costo SES | USD [RELLENAR] |
| Mensajes SQS recibidos + eliminados | [RELLENAR] |
| Costo SQS | USD [RELLENAR] |
| Invocaciones EventBridge | [RELLENAR] |
| Costo EventBridge | USD [RELLENAR] |
| Costo total S3 | USD [RELLENAR] |
| Dentro del presupuesto (USD 0.50) | Sí / No |

---

## Criterios PASS/FAIL (requirements.md §9, S3)

| Criterio | Resultado | Evidencia |
|---|---|---|
| Identidad verificada en sandbox | [RELLENAR] | [ref] |
| Configuration set creado con EventBridge destination | [RELLENAR] | [ref] |
| Envío — SES acepta y retorna MessageId | [RELLENAR] | [MessageId sanitizado] |
| Correlación — MessageId en evento == MessageId de SendEmail | [RELLENAR] | [ref] |
| Evento Delivery recibido en SQS via EventBridge | [RELLENAR] | Latencia: [RELLENAR] |
| Deduplicación — evento duplicado no duplica estado | [RELLENAR] | [ref] |
| Eventos fuera de orden — tolerado sin crash | [RELLENAR] | [ref] |
| Eventos retrasados — no retroceden estado | [RELLENAR] | [ref] |
| Bounce handling — evento Bounce procesado correctamente | [RELLENAR] | [ref] |
| Cleanup — configuration set, rule, queue eliminados | [RELLENAR] | [ref] |

**VEREDICTO**: [RELLENAR: PASS / PARTIAL / FAIL]

---

## Errores

| Error | Mensaje (sanitizado) | Resolución |
|---|---|---|
| [RELLENAR o N/A] | [RELLENAR] | [RELLENAR] |

---

## Logs sanitizados

```
[RELLENAR: extractos del harness sin credenciales ni account IDs]
[Reemplazar account IDs con <ACCOUNT_ID>]
[Reemplazar ARNs con arn:aws:ses:<REGION>:<ACCOUNT_ID>:...]
[Reemplazar emails con operator@example.com / recipient@example.com]
[Reemplazar MessageIds con [primeros-8-chars]-...-[últimos-4-chars]]
[Conservar: event types, latencias, error codes]
```

---

## Limitaciones del sandbox documentadas

| Limitación | Impacto en el spike | Se extrapola para producción |
|---|---|---|
| Solo envío a direcciones verificadas | Solo se prueban bounces/delivery via Mailbox Simulator | Real Bounce/Complaint en producción puede tener latencia diferente |
| Mailbox Simulator genera bounces sintéticos | El evento Bounce puede no ser idéntico al de un bounce real | Documentar en Spec 24 |
| Configuration set requerido para eventos | Sin config set no llegan eventos a EventBridge | Requisito de producción confirmado |

---

## Decisiones para Spec 24 (informativas)

- Arquitectura SES → EventBridge → SQS: [viable / requiere ajustes — RELLENAR]
- Latencia de entrega de eventos: [RELLENAR] ms — aceptable para AGROSBO (no es tiempo real)
- Deduplicación por event ID: [funciona / requiere ajuste — RELLENAR]
- Modo sandbox vs producción: diferencias documentadas arriba

---

## Cleanup S3

```
[ ] Mensajes SQS consumidos / purgados: confirmado
[ ] EventBridge targets eliminados: confirmado
[ ] EventBridge rule eliminada: confirmado
[ ] SES event destination eliminado: confirmado
[ ] SES configuration set eliminado: confirmado
[ ] SQS queue eliminada: confirmado
[ ] Identidad SES temporal eliminada (si aplica): confirmado
```

---

<!-- FIN DEL TEMPLATE — renombrar a manifest-s3.md al completar con evidencia real -->
