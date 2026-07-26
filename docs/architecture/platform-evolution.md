# AGROSBO — Evolución de la plataforma

> Fuente canónica: [`../product/product-scope-v2.md`](../product/product-scope-v2.md).
> Roadmap: [`../roadmap/delivery-roadmap-v2.md`](../roadmap/delivery-roadmap-v2.md).
> Última actualización: julio 2026 (Fase 0).

## Monolito modular (postura actual)

- Un backend Express desplegable como una unidad, organizado por módulos de
  dominio (`api/src/*.ts`), con contratos compartidos en `shared/`.
- Objetivo de despliegue: Lambda (ADR 007). No microservicios.
- Se dividirá solo cuando una necesidad real lo justifique, con un ADR.

## Evolución por horizonte

### CURRENT — Core agrícola offline-first

Gestión integral de finca: bloques, invernaderos, campañas, tareas,
observaciones, aplicaciones, inventario, riego, cosecha, gastos, apicultura,
adjuntos, clima, alertas, reportes. PWA offline-first con cola durable e
idempotencia. Autenticación local, RBAC, providers boundary. Sin despliegue AWS.

### P0 — Agente operacional y despliegue cloud

- Despliegue AWS: S3+CF+OAC, Lambda, Aurora, Data API, Cognito, S3 adjuntos.
- Asistente AGROSBO: Bedrock tool calling, herramientas estructuradas,
  confirmación, cola offline, auditoría.
- Voz: Transcribe STT, Polly TTS.
- Colaboradores externos: token opaco, SES, estados honestos.
- Evaluación visual preliminar: Bedrock multimodal.
- Motor determinista: IrrigationDelayScenario.
- Golden path reproducible, seguridad y hardening.
- Single-organization.

### P1 — Tienda pública de una finca

- Página pública con productos, URL, QR.
- Solicitudes de compra sin registro.
- Comparación de interesados.
- WhatsApp wa.me prellenado (envío humano).
- Notas de voz offline.
- Resumen hablado del día.
- Single-organization.

### P2 — Visión futura (fuera del alcance obligatorio)

- Marketplace multi-organización.
- Pagos, reputación, logística.
- Mensajería en tiempo real (WebSocket).
- WhatsApp Cloud API.
- Multi-tenancy completo.
- Automatización financiera/contractual avanzada.
- Diagnóstico agronómico especializado.

P2 puede documentarse arquitectónicamente pero no retrasará P0 ni P1.

## Tenancy

Single-organization en P0/P1. Multi-tenancy completo es P2. El modelo de
colaborador externo (token scoped) funciona sin tenancy.

## Referencias

- [`../adr/014-product-scope-p0-p1-p2.md`](../adr/014-product-scope-p0-p1-p2.md).
- [`./operational-agent-plan.md`](./operational-agent-plan.md).
- [`./collaboration-model.md`](./collaboration-model.md).
