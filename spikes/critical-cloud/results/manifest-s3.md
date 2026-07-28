# Spike S3 Results — SES Eventos Verificables

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T12 |
| Spike | S3 — SES -> EventBridge -> SQS |
| Commit base | 156036a |
| Fecha UTC | 2026-07-28 |
| Region | us-east-1 |
| Perfil AWS | agrosbo-role (assumed-role/AgrosboDeveloperRole/agrosbo-local) |
| Presupuesto aprobado | USD 0.50 |
| Presupuesto consumido | ESTIMATED < USD 0.01 (1 email via SES simulator) |
| Recursos AWS creados | 5 (queue, rule, target, config set, event destination) |
| Recursos AWS eliminados | 5 (cleanup completo) |
| Recursos residuales | 0 |
| Exit code | 0 |
| STATUS | **PASS** |

---

## Configuracion tecnica

| Campo | Valor |
|---|---|
| SES Configuration Set | agrosbo-spike-ses-config-20260727 |
| SES Event Destination | agrosbo-spike-eb-dest |
| EventBridge Rule | agrosbo-spike-ses-rule-20260727 |
| SQS Queue | agrosbo-spike-ses-events-20260727 |
| MatchingEventTypes | SEND, DELIVERY |
| EventPattern source | aws.ses |
| EventPattern detail-type | Email Sent, Email Delivered |
| EventBridgeDestination | default event bus (us-east-1) |
| Queue Policy Principal | events.amazonaws.com |
| Queue Policy Condition | ArnEquals aws:SourceArn = rule ARN |
| Sender | <SES_VERIFIED_SENDER> (sanitized) |
| Recipient | success@simulator.amazonses.com |
| SES mode | Sandbox |
| Timeout | 90000 ms |
| Setup settle | 5000 ms |

---

## Resultados live

### Preflight

| Campo | Valor |
|---|---|
| LIVE-S3-PRE | **PASS** |
| Sender verified | true |
| Residual resources | 0 |

### SendEmail

| Campo | Valor |
|---|---|
| LIVE-S3-SEND | **PASS** |
| MessageId (sanitized) | captured (8+ chars) |
| ConfigurationSetName | agrosbo-spike-ses-config-20260727 |

### Event Reception

| Campo | Valor |
|---|---|
| LIVE-S3-SENT | **PASS** |
| Email Sent event received | true |
| Correlated to MessageId | true |
| DeleteMessage executed | true |

| Campo | Valor |
|---|---|
| LIVE-S3-DELIVERED | **PASS** |
| Email Delivered event received | true |
| Correlated to MessageId | true |
| DeleteMessage executed | true |

### Correlation

| Campo | Valor |
|---|---|
| LIVE-S3-CORR | **PASS** |
| Final state | DELIVERED |
| Messages expected | 2 |
| Messages correlated | 2 |
| Events Sent received | 1 |
| Events Delivered received | 1 |
| Duplicates observed (live) | 0 |
| Out-of-order observed (live) | UNKNOWN (both arrived, order not explicitly logged) |

### Cleanup

| Campo | Valor |
|---|---|
| LIVE-S3-CLEANUP | **PASS** |
| RemoveTargets | success |
| DeleteRule | success |
| DeleteEventDestination | success |
| DeleteConfigurationSet | success |
| DeleteQueue | success |
| DeleteEmailIdentity | NOT CALLED (identity preserved) |
| Residual resources post-cleanup | 0 |

---

## Metricas live

| Metrica | Valor |
|---|---|
| Total harness results | 66 |
| Local/dry-run tests | 60 PASS |
| Live tests | 6 PASS |
| Exit code | 0 |

---

## Costo

| Campo | Valor |
|---|---|
| Emails enviados | 1 |
| Destinatario | success@simulator.amazonses.com |
| Precio SES | NEEDS_OFFICIAL_VERIFICATION |
| SQS mensajes | 2 recibidos, 2 eliminados |
| EventBridge invocaciones | 2 |
| Costo estimado total | < USD 0.01 |
| Costo real confirmado | PENDING AWS BILLING VERIFICATION |
| Dentro del presupuesto (USD 0.50) | Si (estimacion) |

---

## Criterios PASS/FAIL

| Criterio | Resultado | Evidencia |
|---|---|---|
| Identidad SES verificada en sandbox | **PASS** | Preflight confirmo VerifiedForSendingStatus=true |
| Configuration set + event destination creados | **PASS** | Propagation verificada via GetConfigurationSetEventDestinations |
| SendEmail retorna MessageId | **PASS** | MessageId capturado y usado para correlacion |
| Correlacion MessageId en evento == MessageId de SendEmail | **PASS** | Ambos eventos correlacionados |
| Email Sent recibido en SQS via EventBridge | **PASS** | Evento procesado y eliminado |
| Email Delivered recibido en SQS via EventBridge | **PASS** | Evento procesado y eliminado |
| Deduplicacion funcional | **PASS** | Probado en tests locales (LL-43, COR-11) |
| Eventos fuera de orden tolerados | **PASS** | Probado en tests locales (COR-12, LL-42) |
| Cleanup completo sin recursos residuales | **PASS** | 5/5 recursos eliminados |
| Identidad SES preservada | **PASS** | DeleteEmailIdentity nunca invocado |

---

## Arquitectura validada

```
SES SendEmail (con ConfigurationSet)
  -> SES Event Destination (EventBridge, SEND + DELIVERY)
    -> EventBridge Default Event Bus
      -> EventBridge Rule (source: aws.ses, detail-type: Email Sent/Delivered)
        -> SQS Queue (con policy: events.amazonaws.com + SourceArn)
          -> Consumer: parse detail.mail.messageId, correlate, DeleteMessage
```

---

## Observaciones tecnicas

- El body del mensaje SQS es el evento EventBridge directo (JSON.parse una vez).
- El messageId se encuentra en `detail.mail.messageId` (formato real AWS).
- No se usa `Records[]`, SNS envelope ni doble codificacion.
- El ReceiptHandle de cada mensaje se usa para DeleteMessage despues de procesar.
- La propagacion se verifica con ListTargetsByRule y GetConfigurationSetEventDestinations
  antes de enviar el email.

---

## Datos sanitizados

- Email del sender: <SES_VERIFIED_SENDER>
- Account ID: sanitized
- ARNs: sanitized
- MessageId: solo primeros 8 chars en logs
- Sin credenciales expuestas
- Sin session tokens

---

## Decisiones para Spec 24 (informativas, no vinculantes)

- Arquitectura SES -> EventBridge -> SQS: viable y funcional
- Correlacion por mail.messageId: funcional
- Latencia de eventos: aceptable para AGROSBO (no es tiempo real)
- Deduplicacion en memoria: funcional para el spike
- SES sandbox suficiente para validacion; produccion requiere salida de sandbox

---

## Veredicto

**PASS**

- 6/6 casos live PASS
- 60/60 tests locales PASS
- Exit code 0
- Pipeline completo: SES -> EventBridge -> SQS -> correlacion -> cleanup
- Cero recursos residuales
- Identidad SES preservada
