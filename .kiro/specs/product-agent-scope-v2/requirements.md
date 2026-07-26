# Requirements — product-agent-scope-v2

## 1. Introducción

Esta Spec formaliza y hace trazables las decisiones documentales y de gobierno
de la dirección product-agent-scope-v2. No autoriza implementar el agente, AWS,
voz, colaboración, visión, escenarios, tienda ni cualquier capacidad P0/P1.

Los requisitos congelan el alcance aprobado, definen reglas para Specs
posteriores, mantienen CURRENT separado de PLANNED y establecen criterios
documentales de trazabilidad. Toda implementación funcional se deriva a Specs
17–31.

## 2. Alcance de la Spec

- Gobierno documental de Fase 0.
- Formalización de decisiones de producto, arquitectura y seguridad.
- Trazabilidad entre fuentes canónicas y documentos derivados.
- Separación inequívoca CURRENT vs PLANNED.
- Criterios de aceptación documentales.

## 3. Fuera de alcance

- Implementación de código funcional.
- Creación de CDK stacks, Lambda handlers, componentes React o schemas.
- Despliegue AWS.
- Spikes técnicos.
- Endpoints REST del agente.
- Tablas o migraciones de base de datos.
- Instalación de dependencias.
- Commit, push, PR, merge o deploy.

## 4. Fuentes y jerarquía documental

1. `docs/product/product-scope-v2.md` (contrato canónico).
2. ADRs 014–018 (Accepted).
3. Arquitectura aprobada (`operational-agent-plan.md`, `collaboration-model.md`).
4. Auditoría y documentos derivados (`current-capability-audit-v2.md`,
   `capability-status-matrix.md`, `personas-and-permissions.md`,
   `golden-paths-p0-p1.md`).
5. `docs/roadmap/delivery-roadmap-v2.md` y `docs/spec-map.md`.
6. Esta Spec.
7. Steering.
8. README y demo.
9. Código y tests como evidencia de CURRENT (no redefinen alcance; sí confirman
   o refutan afirmaciones CURRENT).

Cuando exista contradicción, prevalece la fuente de menor número.
`current-capability-audit-v2.md` es evidencia auditada, no contrato canónico.

## 5. Glosario

| Término | Definición |
| --- | --- |
| Asistente AGROSBO | Agente operacional multimodal (nombre técnico: operational farm agent) |
| CURRENT | Implementado y verificado en código |
| PLANNED P0 | Aprobado para hackathon, no implementado |
| PLANNED P1 | Posterior a P0, no implementado |
| P2 / OUT OF SCOPE | Fuera del alcance obligatorio |
| EARS | Easy Approach to Requirements Syntax |
| Herramienta | Función parametrizada invocable por el agente |
| Confirmación reforzada | Confirmación con UI distinguible para acciones sensibles |
| Token opaco | Secreto aleatorio sin contenido decodificable |

## 6. Actores

| Actor | Descripción |
| --- | --- |
| Usuario interno | Persona con cuenta, rol RBAC y sesión activa |
| Colaborador externo | Persona sin cuenta; acceso limitado vía token |
| Asistente AGROSBO | Agente operacional; actúa con permisos del usuario |
| SES | Servicio de envío de correo (Amazon) |
| Sistema | Backend AGROSBO (Lambda + Aurora + servicios) |

## 7. Requisitos EARS

### A. Identidad y alcance

**REQ-A01**: THE DOCUMENTATION SHALL present AGROSBO as an offline-first
agricultural operations platform.
Source: product-scope-v2 §2.

**REQ-A02**: THE DOCUMENTATION SHALL present Asistente AGROSBO as a PLANNED P0
operational farm agent, not as implemented.
Source: product-scope-v2 §2, §6.

**REQ-A03**: WHEN a document references capability state, THE DOCUMENTATION
SHALL separate P0, P1 and P2 capacities explicitly.
Source: product-scope-v2 §6–§8; ADR 014.

**REQ-A04**: THE DOCUMENTATION SHALL declare single-organization as the
deployment model for P0 and P1.
Source: product-scope-v2 §8; ADR 014.

**REQ-A05**: THE DOCUMENTATION SHALL NOT present any PLANNED capacity as
CURRENT without verified code, routes, persistence and tests.
Source: product-scope-v2 §1.

**REQ-A06**: THE DOCUMENTATION SHALL NOT present full multi-tenancy as a P0/P1
requirement.
Source: ADR 014.

### B. Modelo del agente

**REQ-B01**: THE DOCUMENTATION SHALL specify that the agent invokes structured
tools only; no generated SQL.
Source: product-scope-v2 §5; ADR 015.

**REQ-B02**: THE DOCUMENTATION SHALL specify that assertions about farm state
require tool invocation with real data.
Source: product-scope-v2 §5.

**REQ-B03**: THE DOCUMENTATION SHALL specify that general help, interface
guidance and clarifications may be generated without tools when they do not
assert operational facts.
Source: product-scope-v2 §5.

**REQ-B04**: THE DOCUMENTATION SHALL specify REST as the P0 protocol for the
agent endpoint.
Source: operational-agent-plan §2.

**REQ-B05**: THE DOCUMENTATION SHALL specify SSE as optionally evaluable for
progress transmission.
Source: operational-agent-plan §2.

**REQ-B06**: THE DOCUMENTATION SHALL specify WebSocket as out of P0 scope.
Source: operational-agent-plan §2; ADR 014.

### C. Mutaciones internas

**REQ-C01**: WHEN the agent proposes an internal mutation, THE DOCUMENTATION
SHALL specify that a visible draft is required before execution.
Source: ADR 015.

**REQ-C02**: THE DOCUMENTATION SHALL specify that the user may edit or discard
the draft.
Source: ADR 015.

**REQ-C03**: THE DOCUMENTATION SHALL specify explicit PWA confirmation before
any internal mutation executes.
Source: ADR 015.

**REQ-C04**: THE DOCUMENTATION SHALL specify reinforced confirmation for
sensitive actions (expenses, inventory, deletions, publications,
external communications, contractual/financial effects).
Source: product-scope-v2 §5; ADR 015.

**REQ-C05**: THE DOCUMENTATION SHALL specify that confirmed mutations enter the
offline queue (Dexie) with X-Idempotency-Key.
Source: ADR 015.

**REQ-C06**: THE DOCUMENTATION SHALL specify deterministic, idempotent
server-side execution.
Source: ADR 015.

**REQ-C07**: THE DOCUMENTATION SHALL specify audit logging with minimal metadata.
Source: ADR 015.

**REQ-C08**: THE DOCUMENTATION SHALL prohibit autonomous mutation by LLM
decision without PWA confirmation.
Source: ADR 015.

### D. Operaciones externas y técnicas

**REQ-D01**: WHEN an external collaborator submits a response via valid token
and explicit action, THE DOCUMENTATION SHALL specify that no additional PWA
confirmation is required.
Source: ADR 015; collaboration-model §2.

**REQ-D02**: THE DOCUMENTATION SHALL specify that external responses must be
idempotent, scoped to one task, and audited.
Source: ADR 015; ADR 017.

**REQ-D03**: THE DOCUMENTATION SHALL specify that SES events are validated and
deduplicated.
Source: ADR 017.

**REQ-D04**: THE DOCUMENTATION SHALL specify TTL expiration as automatic.
Source: ADR 017.

**REQ-D05**: THE DOCUMENTATION SHALL specify revocation as manually initiated
by an authorized user.
Source: ADR 017; steering/security.

**REQ-D06**: THE DOCUMENTATION SHALL specify that no exception enables
autonomous LLM mutation.
Source: ADR 015.

### E. Colaboración y SES

**REQ-E01**: THE DOCUMENTATION SHALL specify internal collaborators with account
and RBAC role.
Source: personas-and-permissions.

**REQ-E02**: THE DOCUMENTATION SHALL specify external collaborators without full
account, using opaque token with cryptographic entropy and persisted hash.
Source: ADR 017.

**REQ-E03**: THE DOCUMENTATION SHALL specify TTL, revocation, rate limiting, and
task scope for external tokens.
Source: ADR 017.

**REQ-E04**: THE DOCUMENTATION SHALL specify minimal data exposure for external
collaborators.
Source: ADR 017; product-scope-v2 §10.

**REQ-E05**: THE DOCUMENTATION SHALL specify accept/reject/clarify as the only
external actions.
Source: product-scope-v2 §10.

**REQ-E06**: WHEN SES rejects a send request, THE DOCUMENTATION SHALL specify
that no sent event is created.
Source: ADR 017.

**REQ-E07**: WHEN SES accepts a send request and returns a message ID, THE
DOCUMENTATION SHALL specify that sent is registered.
Source: ADR 017.

**REQ-E08**: WHEN a verifiable delivery event is received from SES, THE
DOCUMENTATION SHALL specify that delivered is registered.
Source: ADR 017.

**REQ-E09**: THE DOCUMENTATION SHALL specify that opened_link does not prove
human reading.
Source: ADR 017.

**REQ-E10**: WHEN duplicated or out-of-order events are received, THE
DOCUMENTATION SHALL specify deduplication and correct handling without state
regression.
Source: ADR 017; collaboration-model §3.

**REQ-E11**: THE DOCUMENTATION SHALL specify the collaboration record as
separate from the notification event log.
Source: ADR 017; collaboration-model §3.

**REQ-E12**: THE DOCUMENTATION SHALL differentiate SES sandbox from production
access.
Source: ADR 017.

### F. Voz

**REQ-F01**: THE DOCUMENTATION SHALL specify Amazon Transcribe as P0 STT.
Source: product-scope-v2 §11.

**REQ-F02**: THE DOCUMENTATION SHALL specify Amazon Polly as P0 TTS.
Source: product-scope-v2 §11.

**REQ-F03**: THE DOCUMENTATION SHALL specify push-to-talk as initial
interaction, streaming preferred, short clip as fallback.
Source: product-scope-v2 §11.

**REQ-F04**: THE DOCUMENTATION SHALL specify text always visible alongside
audio.
Source: product-scope-v2 §11.

**REQ-F05**: THE DOCUMENTATION SHALL specify editable transcription before
submission to the agent.
Source: product-scope-v2 §11.

**REQ-F06**: WHEN Transcribe or Polly is unavailable while the agent remains
reachable, THE INTERFACE SHALL preserve a text-only interaction path. WHEN the
device has no network connectivity, THE DOCUMENTATION SHALL state that the
agent, STT and TTS are unavailable, while local operational capture remains
available.
Source: product-scope-v2 §11, §15.

**REQ-F07**: THE DOCUMENTATION SHALL classify offline voice notes as P1.
Source: product-scope-v2 §7.5.

### G. Evaluación visual

**REQ-G01**: THE DOCUMENTATION SHALL specify Bedrock multimodal as the P0
visual assessment technology.
Source: product-scope-v2 §12; ADR 018.

**REQ-G02**: THE DOCUMENTATION SHALL specify that visual assessment is
preliminary, never definitive diagnosis.
Source: ADR 018.

**REQ-G03**: THE DOCUMENTATION SHALL specify a safety notice in every
assessment output.
Source: ADR 018.

**REQ-G04**: THE DOCUMENTATION SHALL specify confidence level and missing
information in every assessment.
Source: ADR 018.

**REQ-G05**: THE DOCUMENTATION SHALL NOT specify automatic agrochemical
recommendations.
Source: ADR 018.

**REQ-G06**: THE DOCUMENTATION SHALL NOT specify Rekognition as the primary
engine.
Source: ADR 018.

**REQ-G07**: THE DOCUMENTATION SHALL NOT specify a custom-trained model in P0.
Source: ADR 018.

### H. Escenarios deterministas

**REQ-H01**: THE DOCUMENTATION SHALL specify IrrigationDelayScenario as a
separate deterministic module.
Source: product-scope-v2 §13; ADR 018.

**REQ-H02**: THE DOCUMENTATION SHALL specify deterministic, reproducible
calculation producing baseline, bestCase, expectedCase, worstCase, range,
assumptions, dataUsed, missingData, and confidence.
Source: product-scope-v2 §13.

**REQ-H03**: THE DOCUMENTATION SHALL specify that the LLM explains and
summarizes but does not perform the primary calculation.
Source: ADR 018.

**REQ-H04**: THE DOCUMENTATION SHALL NOT specify result guarantees.
Source: ADR 018.

### I. AWS y arquitectura

**REQ-I01**: THE DOCUMENTATION SHALL specify S3 private + CloudFront + OAC for
frontend hosting.
Source: ADR 016.

**REQ-I02**: THE DOCUMENTATION SHALL specify API Gateway HTTP API as the API
entry point.
Source: ADR 016.

**REQ-I03**: THE DOCUMENTATION SHALL specify Lambda as compute.
Source: product-scope-v2 §14; docs/architecture/current-and-target.md.

**REQ-I04**: THE DOCUMENTATION SHALL specify Aurora PostgreSQL Serverless v2 +
Data API.
Source: product-scope-v2 §14.

**REQ-I05**: THE DOCUMENTATION SHALL specify Cognito, S3 attachments, Bedrock,
Transcribe, Polly, SES, Secrets Manager, CloudWatch, and CDK as PLANNED P0
services.
Source: product-scope-v2 §14.

**REQ-I06**: THE DOCUMENTATION SHALL specify Amplify Hosting as evaluated and
discarded.
Source: ADR 016.

**REQ-I07**: THE DOCUMENTATION SHALL NOT decide CloudFront /api/* routing in
this Spec; topology deferred to infrastructure Spec.
Source: ADR 016.

**REQ-I08**: THE DOCUMENTATION SHALL specify configurable API URL and CORS as
valid options for separate origins.
Source: ADR 016.

**REQ-I09**: THE DOCUMENTATION SHALL NOT present any service as deployed without
verified evidence.
Source: product-scope-v2 §3.

### J. Seguridad y auditoría

**REQ-J01**: THE DOCUMENTATION SHALL specify that the agent acts with effective
user permissions; never elevated.
Source: ADR 015; operational-agent-plan §11.

**REQ-J02**: THE DOCUMENTATION SHALL specify audit with minimal metadata: user,
tool, timestamp, duration, technical result, entity IDs.
Source: ADR 015.

**REQ-J03**: THE DOCUMENTATION SHALL specify redaction of sensitive parameters.
Source: ADR 015.

**REQ-J04**: THE DOCUMENTATION SHALL prohibit storing raw tokens, secrets,
passwords, audio, full images, or unnecessary sensitive payloads in audit.
Source: ADR 015.

**REQ-J05**: THE DOCUMENTATION SHALL defer retention policy to Spec 30.
Source: ADR 015.

**REQ-J06**: THE DOCUMENTATION SHALL prohibit autonomous financial or
contractual automation.
Source: product-scope-v2 §5; ADR 018.

### K. Horizontes

**REQ-K01**: THE DOCUMENTATION SHALL classify P1 (public farm store, URL/QR,
purchase requests, comparison, wa.me, offline voice notes, spoken summary) as
starting only after P0 closes with Spec 31.
Source: product-scope-v2 §7; delivery-roadmap-v2.

**REQ-K02**: THE DOCUMENTATION SHALL classify P2 (marketplace, payments,
reputation, logistics, realtime messaging, WhatsApp Cloud API, full
multi-tenancy, advanced automation) as out of scope.
Source: product-scope-v2 §8; ADR 014.

**REQ-K03**: THE DOCUMENTATION SHALL classify spatial endpoints as future
technical debt, not blocking P0 or the golden path.
Source: capability-status-matrix; spec-map.

### L. Gobierno de Fase 0

**REQ-L01**: THIS SPEC SHALL NOT implement any product functionality.
Source: runbook §5.

**REQ-L02**: THE SPEC CHAIN SHALL execute Requirements → Design → Tasks
sequentially.
Source: runbook §13.

**REQ-L03**: SUBSEQUENT SPECS (17–31) SHALL execute functional implementation.
Source: delivery-roadmap-v2.

**REQ-L04**: THIS SPEC SHALL NOT create code, schema, migrations, dependencies,
or infrastructure.
Source: runbook §5.

**REQ-L05**: THIS SPEC SHALL NOT perform commit, push, PR, merge, or deploy.
Source: runbook §6.

**REQ-L06**: THE BASELINE SHALL be 165 tests (132 unit + 7 MemStorage + 26
PostgreSQL integration).
Source: audit-v2 §1.

**REQ-L07**: EVERY requirement SHALL trace to an approved source.
Source: runbook §2.2.

## 8. Requisitos negativos

**REQ-NEG01**: THE DOCUMENTATION SHALL NOT present chatbot, marketplace, ERP,
certifier, government system, payment platform, or autonomous decision system
as descriptions of AGROSBO.
Source: product-scope-v2 §19.

**REQ-NEG02**: THE DOCUMENTATION SHALL NOT claim offline operation for agent
inference, STT/TTS in real time, or external communications. Local capture of
a voice note for later processing (P1) is not prohibited by this requirement.
Source: product-scope-v2 §15.

**REQ-NEG03**: THE DOCUMENTATION SHALL NOT invent productivity metrics or
agricultural yield guarantees.
Source: product-scope-v2 §17.

**REQ-NEG04**: THE DOCUMENTATION SHALL NOT present Spec 16 as a Fase 0
deliverable.
Source: delivery-roadmap-v2.

## 9. Criterios de aceptación documentales

1. Todos los documentos del repositorio reflejan P0/P1/P2 sin contradicciones.
2. Amplify no aparece como target activo.
3. CloudFront /api/* no está decidido.
4. SES con semántica honesta (sent/delivered/opened_link).
5. Agente como PLANNED P0 con confirmación obligatoria.
6. 165 pruebas como baseline.
7. Trazabilidad completa requirement → fuente aprobada.
8. Sin endpoints, schemas o implementación inventados.
9. Quality gates verdes (format, encoding, lint, typecheck, test, build).

## 10. Matriz requisito → fuente aprobada

| Grupo | Fuente principal |
| --- | --- |
| A (Identidad) | product-scope-v2 §2,§6–§8; ADR 014 |
| B (Agente) | product-scope-v2 §5; ADR 015; operational-agent-plan |
| C (Mutaciones) | ADR 015 |
| D (Externas) | ADR 015; ADR 017; collaboration-model |
| E (Colaboración) | ADR 017; product-scope-v2 §10; personas |
| F (Voz) | product-scope-v2 §11 |
| G (Visual) | product-scope-v2 §12; ADR 018 |
| H (Escenarios) | product-scope-v2 §13; ADR 018 |
| I (AWS) | ADR 016; product-scope-v2 §14 |
| J (Seguridad) | ADR 015; operational-agent-plan §10–§11 |
| K (Horizontes) | product-scope-v2 §7–§8; delivery-roadmap-v2 |
| L (Gobierno) | runbook; delivery-roadmap-v2 |
| NEG | product-scope-v2 §15,§17,§19; delivery-roadmap-v2 |

## 11. Dependencias con Specs posteriores

| Spec | Relación |
| --- | --- |
| 16 multi-agent-workflow | Habilitador posterior; no entregable de Fase 0 |
| 17 critical-cloud-spikes | Valida viabilidad técnica de REQ-I01–I09, REQ-F01–F06, REQ-E01–E12, REQ-G01–G07 |
| 18–20 AWS infrastructure | Implementa REQ-I01–I09 |
| 21 farm-operational-agent | Implementa REQ-B01–B06 |
| 22 agent-actions | Implementa REQ-C01–C08 |
| 23 voice-assistant | Implementa REQ-F01–F06 |
| 24 collaborators | Implementa REQ-D01–D06, REQ-E01–E12 |
| 25 crop-image | Implementa REQ-G01–G07 |
| 26 farm-scenarios | Implementa REQ-H01–H04 |
| 27–28 P1 | Implementa REQ-K01, REQ-F07 (notas de voz offline) |
| 28 p1-communication-and-offline-voice | Implementa REQ-F07 |
| 29 ui-accessibility-polish | Valida/pule presentación de interacciones |
| 30 security-cost-reliability | Implementa REQ-J01–J06 |
| 31 demo | Verifica golden path completo P0 |

## 12. Riesgos y ambigüedades explícitas

| # | Riesgo | Mitigación |
| --- | --- | --- |
| 1 | Complejidad de integración AWS en tiempo limitado | Spikes en Spec 17 antes de implementar |
| 2 | SES sandbox limita demo con externos reales | Gestionar acceso producción tempranamente |
| 3 | Calidad de evaluación visual depende de modelo/prompt | Iteración en Spec 25 |
| 4 | UX friction por confirmaciones excesivas | Diseño de UI en Spec 22 |
| 5 | Disponibilidad/costos de Bedrock por región | Verificar en Spec 17 |
