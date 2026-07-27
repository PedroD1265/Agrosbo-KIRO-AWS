# Requirements — critical-cloud-spikes (Spec 17)

## 1. Introduccion

Esta Spec valida la viabilidad tecnica de cuatro servicios AWS criticos para el
golden path P0 de AGROSBO mediante spikes pequenos, aislados y desechables. Los
spikes producen evidencia reproducible; no producen codigo de produccion.

## 2. Alcance positivo

Los siguientes cuatro harnesses son obligatorios:

| # | Spike | Servicio AWS | Objetivo |
|---|-------|-------------|----------|
| S1 | Bedrock tool calling | Amazon Bedrock | Invocar un modelo con tool definitions; recibir tool_use; devolver resultado; verificar composicion de respuesta |
| S2 | Transcribe voz agricola | Amazon Transcribe | Transcribir clips sinteticos en espanol con vocabulario agricola; medir exactitud (WER) y latencia |
| S3 | SES eventos verificables | Amazon SES | Enviar correo; recibir eventos SNS (Delivery, Bounce, Complaint); deduplicar; verificar message ID |
| S4 | Token externo seguro | Local + crypto | Generar token opaco; hash SHA-256; validar; expirar por TTL; revocar; transicion idempotente de estados |

Microvalidaciones documentales opcionales (sin harness de ejecucion obligatorio):

| # | Microvalidacion | Objetivo |
|---|-----------------|----------|
| M1 | Amazon Polly | Documentar disponibilidad de voces es-* neutrales, latencia esperada, formato de audio y costos |
| M2 | Aurora PostgreSQL + Data API | Documentar compatibilidad regional, disponibilidad de engine version, limites de Data API y latencia esperada |

## 3. Alcance negativo (fuera de scope)

- No implementar codigo de produccion en `api/src/`, `web/src/`, `shared/` o
  `infra/src/`.
- No crear CDK stacks funcionales.
- No modificar schemas ni migraciones.
- No instalar dependencias en el monorepo (`package.json`, `package-lock.json`).
- No crear roles IAM permanentes; solo politicas temporales minimas.
- No desplegar infraestructura que persista tras el cleanup.
- No almacenar datos reales de usuarios ni de la finca.
- No conectar spikes al backend existente.
- No usar los spikes como libreria importable por la aplicacion.
- No fijar modelo Bedrock, region o configuracion definitiva sin evidencia del
  spike.
- No ejecutar Spec 18+ sin cerrar Spec 17.
- No crear recursos fuera de la region seleccionada para el spike.
- Polly y Aurora/Data API son microvalidaciones documentales; no requieren
  ejecucion de codigo como criterio de cierre de Spec 17.

## 4. Datos sinteticos

Todos los datos utilizados en los spikes son sinteticos y no contienen PII ni
datos reales de la finca.

| Spike | Datos sinteticos requeridos |
|-------|---------------------------|
| S1 | Inventario ficticio, tareas ficticias, prompt de prueba con 2-3 herramientas |
| S2 | 3-5 clips de audio sinteticos en espanol con vocabulario agricola (riego, fumigacion, cosecha, bloque, invernadero). Generados con TTS o grabados por el operador. Duracion 5-15s por clip |
| S3 | Direcciones de correo verificadas en SES sandbox (operador). Contenido de correo ficticio |
| S4 | Tareas ficticias con IDs sinteticos; tokens generados en runtime |

## 5. Seguridad, secretos y privacidad

### REQ-SEC-01
THE SYSTEM SHALL NOT persist AWS credentials in the repository, logs, or spike
output artifacts.

### REQ-SEC-02
THE SYSTEM SHALL use only temporary AWS credentials (STS session tokens via
assumed role) for spike execution.

### REQ-SEC-03
THE SYSTEM SHALL NOT log, store, or output PII, real user data, or production
secrets during spike execution.

### REQ-SEC-04
THE SPIKE S4 SHALL persist only the SHA-256 hash of the generated token; the
raw token SHALL be used only in-memory during validation.

### REQ-SEC-05
THE SYSTEM SHALL sanitize all output artifacts before archiving: redact account
IDs, ARNs, session tokens, and any identifiers that could expose infrastructure.

### REQ-SEC-06
THE SYSTEM SHALL NOT create IAM users or permanent access keys. Only roles with
temporary credentials are permitted.

### REQ-SEC-07
THE SES SPIKE SHALL use only sandbox-verified addresses owned by the operator.

## 6. Restricciones de costo

### REQ-COST-01
EACH SPIKE SHALL be designed to complete within a budget ceiling proposed by this
document and subject to human approval before execution:
- S1 (Bedrock): propuesta <= USD 2.00 por ejecucion completa.
- S2 (Transcribe): propuesta <= USD 1.00 por ejecucion completa.
- S3 (SES): propuesta <= USD 0.50 por ejecucion completa.
- S4 (Token): USD 0.00 (ejecucion local).

Estos valores son propuestas. El humano debe aprobar los limites antes de la
ejecucion real.

### REQ-COST-02
THE SPIKE HARNESS SHALL abort execution if it detects or estimates that the
operation will exceed the approved budget ceiling (soft stop).

### REQ-COST-03
THE OPERATOR SHALL verify that AWS Budget alerts and Cost Anomaly Detection are
active before executing any cloud spike (manual confirmation).

### REQ-COST-04
THE SYSTEM SHALL NOT use provisioned throughput, reserved capacity, or
committed-use models during spikes.

### REQ-COST-05
THE SYSTEM SHALL prefer on-demand pricing for all spike operations.

## 7. Region

### REQ-REG-01
THE REGION for spike execution SHALL be determined during the preflight-cloud
checkpoint by verifying actual availability of required services (Bedrock models,
Transcribe es-*, SES sandbox). The region is NOT pre-decided in this document.

### REQ-REG-02
THE SPIKE HARNESS SHALL document the region used and the rationale for selection
in the results manifest.

### REQ-REG-03
IF the provisionally configured region (`sa-east-1`) does not support a required
service, THE OPERATOR SHALL select an alternative region and document the
decision.

### REQ-REG-04
THE REGION decision for spikes does NOT bind the production deployment region.
Production region is decided in Spec 18.

## 8. Permisos minimos por servicio

### REQ-IAM-01
EACH SPIKE SHALL document the minimum IAM actions required before execution.
Permissions SHALL follow least-privilege.

### REQ-IAM-02
PROPOSED minimum permissions (draft subject to generation and review during
Checkpoint 3.2 — not a final policy):

| Spike | Proposed IAM Actions (draft) |
|-------|---------------------|
| S1 | `bedrock:InvokeModel` (required by Converse API), `bedrock:InvokeModelWithResponseStream` (required by ConverseStream, optional), `bedrock:ListFoundationModels` (discovery) |
| S2 streaming (obligatorio) | `transcribe:StartStreamTranscription` |
| S2 batch (fallback/comparacion) | `transcribe:StartTranscriptionJob`, `transcribe:GetTranscriptionJob`, `s3:PutObject`, `s3:GetObject` (temp bucket for audio) |
| S3 | `ses:SendEmail`, `sesv2:CreateConfigurationSet`, `sesv2:CreateConfigurationSetEventDestination`, `sesv2:DeleteConfigurationSet`, `sesv2:DeleteConfigurationSetEventDestination`, `events:PutRule`, `events:PutTargets`, `events:DeleteRule`, `events:RemoveTargets`, `sqs:CreateQueue`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:DeleteQueue`, `sqs:GetQueueAttributes`, `sqs:SetQueueAttributes` |
| S4 | Ninguno (ejecucion local; PostgreSQL local para prueba de concurrencia) |

Notes on Bedrock IAM:
- The Converse API uses `bedrock:InvokeModel` as its underlying permission.
- ConverseStream uses `bedrock:InvokeModelWithResponseStream`.
- There is no separate `bedrock:Converse` IAM action.
- `bedrock:ListFoundationModels` is used for model discovery during preflight.

This table is a preliminary draft. The actual IAM policy document SHALL be
generated and reviewed during Checkpoint 3.2 based on current AWS documentation.
Do not copy this table as a deployable policy.

### REQ-IAM-03
THE OPERATOR SHALL create a temporary IAM policy scoped exclusively to the
spike resources. The policy SHALL be deleted during cleanup.

### REQ-IAM-04
THE SYSTEM SHALL NOT use the `AgrosboDeveloperRole` (ReadOnlyAccess) for spike
execution. A role with spike-specific permissions is required.

## 9. Criterios PASS/FAIL por spike

### S1 — Bedrock tool calling

| Criterio | PASS | FAIL |
|----------|------|------|
| Invocacion de modelo | Respuesta valida recibida | Error de API o timeout |
| Tool use | Modelo emite tool_use con nombre y parametros correctos | No emite tool_use o parametros invalidos |
| Composicion | Tras devolver tool_result, modelo compone respuesta final | No integra resultado o alucina |
| Latencia | Respuesta completa < 10s (cold) | > 30s o timeout |
| Costo | Dentro del budget aprobado | Excede budget |

### S2 — Transcribe voz agricola

Streaming es el smoke test obligatorio. Batch es fallback/comparacion. Un
resultado exclusivamente batch no puede marcarse PASS; se marca
APPROVED_WITH_LIMITATIONS o FALLBACK_REQUIRED.

| Criterio | PASS | FAIL |
|----------|------|------|
| Streaming funcional | StartStreamTranscription conecta y emite parciales | Error de conexion o sin parciales |
| Latencia streaming | Primera palabra parcial < 2s | > 5s |
| Transcripcion final | Texto reconocible en espanol | Texto vacio o incoherente |
| WER | <= 30% en vocabulario agricola sintetico | > 50% |
| Vocabulario custom | Custom vocabulary mejora WER vs. baseline (si se prueba) | No mejora o empeora |
| Latencia batch (fallback) | Job completo < 30s para clip de 15s | > 60s |
| Idioma | es-US o es-ES reconoce vocabulario agricola; es-MX evaluado opcionalmente | Ningun dialecto es-* disponible |
| Solo batch sin streaming | N/A | APPROVED_WITH_LIMITATIONS (no PASS completo) |

### S3 — SES eventos verificables

| Criterio | PASS | FAIL |
|----------|------|------|
| Identidad verificada | Identidad (email o dominio) verificada en sandbox | No verificable |
| Configuration set | Configuration set creado con EventBridge event destination | Error de creacion |
| Envio | SES acepta y retorna MessageId (envio asociado al configuration set) | Rechazo o error |
| Correlacion | MessageId en evento coincide con el retornado por SendEmail | No coincide |
| Evento Delivery | Evento recibido en SQS via EventBridge con tipo Delivery | No se recibe en 5 min |
| Deduplicacion | Evento duplicado procesado sin efecto | Estado duplicado |
| Eventos fuera de orden | Procesamiento tolera opened_link antes de delivered | Crash o estado inconsistente |
| Eventos retrasados | Evento tardio no retrocede estado principal | Estado retrocede |
| Bounce handling | Evento Bounce (via Mailbox Simulator) procesado correctamente | Crash o estado inconsistente |
| Cleanup | Configuration set, EventBridge rule+targets, SQS queue eliminados | Recursos residuales |

### S4 — Token externo seguro

| Criterio | PASS | FAIL |
|----------|------|------|
| Generacion | Token >= 32 bytes, base64url, entropia criptografica | < 32 bytes o Math.random |
| Hash | SHA-256 del token coincide con persistido | No coincide |
| Validacion | Token valido produce acceso; token invalido produce rechazo | Falso positivo o negativo |
| TTL | Token expirado produce rechazo | Permite acceso post-expiracion |
| Revocacion | Token revocado produce rechazo | Permite acceso post-revocacion |
| Idempotencia | Misma accion con mismo token no duplica efecto | Duplica efecto |
| Transicion | Estado avanza correctamente (opened_link → responded → completed) | Retrocede o estado invalido |
| Concurrencia PG | 10 solicitudes concurrentes producen una sola transicion | Mas de una transicion o corrupcion |
| Replay PG | Replay identico es idempotente en PostgreSQL | Error o duplicacion |
| Conflicto PG | Respuesta contradictoria produce conflicto controlado | Ambas ganan o crash |

## 10. Metricas

### REQ-MET-01
EACH SPIKE SHALL report the following metrics in its results manifest:

| Metrica | Aplica a |
|---------|----------|
| Latencia p50, p95 (ms) | S1, S2, S3 |
| WER (Word Error Rate) | S2 |
| Costo real (USD) | S1, S2, S3 |
| Costo estimado por operacion unitaria | S1, S2, S3 |
| Tasa de error (%) | S1, S2, S3, S4 |
| Throughput (ops/min) | S4 |
| Entropia (bits) del token | S4 |

### REQ-MET-02
THE RESULTS MANIFEST SHALL include raw timing data and summary statistics,
sanitized of account identifiers.

## 11. Cleanup obligatorio

### REQ-CLN-01
EVERY cloud resource created during spike execution SHALL be deleted during the
cleanup checkpoint.

### REQ-CLN-02
THE CLEANUP SHALL be verified by listing resources post-deletion and confirming
zero spike-related resources remain.

### REQ-CLN-03
THE FOLLOWING resources are candidates for cleanup:
- S3 buckets (temp audio, temp artifacts).
- SQS queues (SES event reception).
- EventBridge rules and targets.
- SES configuration sets and their event destinations.
- IAM policies (spike-specific).
- CloudWatch log groups (if created by Transcribe).
- PostgreSQL temp tables (spike_collab_tokens).

### REQ-CLN-04
IF cleanup cannot be completed automatically, THE OPERATOR SHALL perform manual
cleanup and document it in the results manifest.

### REQ-CLN-05
THE SPIKE CODE under `spikes/critical-cloud/` SHALL remain in the repository as
evidence but SHALL NOT be imported by production code.

## 12. Evidencia reproducible y sanitizada

### REQ-EVD-01
EACH SPIKE SHALL produce a results manifest file documenting: date, region,
model/service version used, metrics, PASS/FAIL per criterion, sanitized logs,
and cleanup confirmation.

### REQ-EVD-02
ALL output SHALL be sanitized: no AWS account IDs, no ARNs, no session tokens,
no email addresses (replace with placeholders).

### REQ-EVD-03
THE RESULTS MANIFEST SHALL be committed to the repository under
`spikes/critical-cloud/results/` as evidence.

### REQ-EVD-04
THE SPIKE SHALL be reproducible: another operator with equivalent permissions
SHALL be able to re-execute the harness and obtain comparable results.

### REQ-EVD-05
AUDIO FILES for S2 (if synthetic TTS) SHALL be committed as test fixtures.
Recordings by the operator SHALL be documented but not required to be committed
if they contain voice biometrics.

## 13. Condiciones STOP REQUIRED

### REQ-STP-01
STOP REQUIRED SHALL be applied immediately when:
- A spike exceeds or is projected to exceed the approved budget ceiling.
- IAM permissions required are broader than proposed in REQ-IAM-02.
- A required service is not available in any accessible region.
- A contradiction with product-scope-v2 or an ADR is detected.
- The spike requires modifying production code or schemas.
- Cleanup cannot be completed and resources persist.
- Credentials or secrets are detected in output artifacts.
- The operator's AWS role does not have sufficient permissions and escalation
  is needed.
- A Bedrock model requires access approval and the approval is not yet granted.
- Human decision is needed on region, model selection, or budget.

### REQ-STP-02
AFTER applying STOP REQUIRED, THE AGENT SHALL produce a report explaining the
condition and wait for human resolution before continuing.

## 14. Distincion VERIFIED_IN_SPIKE vs IMPLEMENTED

### REQ-DIS-01
A capability marked VERIFIED_IN_SPIKE means: the service has been invoked
successfully in an isolated harness with synthetic data; latency, cost, and
correctness metrics are known; the result informs but does not replace
implementation.

### REQ-DIS-02
A capability marked IMPLEMENTED means: production code exists in `api/src/`,
`web/src/`, `shared/`, or `infra/src/`; it is tested by the CI suite; it is
deployable.

### REQ-DIS-03
SPIKE CODE under `spikes/critical-cloud/` SHALL NOT be promoted to production
without reimplementation in the appropriate Spec (18–26).

### REQ-DIS-04
THE capability-status-matrix SHALL NOT be updated to IMPLEMENTED based on spike
results. It MAY note VERIFIED_IN_SPIKE as an informational annotation.

## 15. Requisitos negativos adicionales

### REQ-NEG-01
THE SYSTEM SHALL NOT fix CloudFront /api/* routing topology as a spike decision.

### REQ-NEG-02
THE SYSTEM SHALL NOT fix a Bedrock model ID as a permanent decision. The spike
validates capability; model selection is revisited in Spec 21.

### REQ-NEG-03
THE SYSTEM SHALL NOT fix a production region based solely on spike results.

### REQ-NEG-04
THE SYSTEM SHALL NOT create AWS resources outside the spike scope (no VPC, no
Aurora, no Lambda, no API Gateway).

### REQ-NEG-05
THE SYSTEM SHALL NOT deploy the existing application code to AWS during this
Spec.

### REQ-NEG-06
THE SYSTEM SHALL NOT skip cleanup to save time.

### REQ-NEG-07
THE SYSTEM SHALL NOT present spike results as production readiness.

## 16. Trazabilidad

| Requirement | Source |
|-------------|--------|
| REQ-SEC-* | product-scope-v2 §4 (principio 5), ADR 015, Steering security |
| REQ-COST-* | product-scope-v2 §6.19, workstation-readiness §8 |
| REQ-REG-* | workstation-readiness §7, aws-service-plan |
| REQ-IAM-* | product-scope-v2 §4 (principio 5), AGENTS.md §12 |
| REQ-S1-* (PASS/FAIL) | product-scope-v2 §6.2, operational-agent-plan §3, ADR 018 |
| REQ-S2-* (PASS/FAIL) | product-scope-v2 §6.4, §11 |
| REQ-S3-* (PASS/FAIL) | product-scope-v2 §6.11, ADR 017 |
| REQ-S4-* (PASS/FAIL) | product-scope-v2 §6.10, §6.12, ADR 017, collaboration-model §2 |
| REQ-MET-* | delivery-roadmap-v2 Spec 17 entry |
| REQ-CLN-* | AGENTS.md §12, docs/agents/command-policy.md, docs/architecture/aws-service-plan.md |
| REQ-EVD-* | delivery-roadmap-v2, product-scope-v2 §6.20 |
| REQ-STP-* | AGENTS.md §10, Spec 16 REQ-J01 |
| REQ-DIS-* | Steering tech (MUST NOT declare deferred as implemented) |
| REQ-NEG-* | Steering tech, ADR 016, product-scope-v2 §14 |
