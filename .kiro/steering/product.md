# AGROSBO — Producto

Responsabilidad: definir qué es y qué NO es AGROSBO. Fuente única de la intención
de producto. La fuente canónica del alcance es
[`docs/product/product-scope-v2.md`](../../docs/product/product-scope-v2.md).

## Qué es

AGROSBO es una plataforma web **offline-first** para gestionar operaciones
agrícolas: centraliza la información de la finca, coordina el trabajo de campo y
convierte registros dispersos en acciones, historial y evidencia operativa.
Integra un **agente operacional multimodal** (Asistente AGROSBO) como interfaz
central.

## Usuarios

- **Propietario / encargado**: planifica, prioriza, decide.
- **Técnico / operario de campo**: registra datos, frecuentemente offline.
- **Rol financiero**: registra y consulta gastos.
- **Colaborador externo (P0)**: responde a tareas vía enlace seguro sin cuenta.
- **(P1) Visitante / comprador**: tienda pública sin registro.

## Capacidades (horizonte obligatorio)

### CURRENT — Implementado

Gestión integral de finca (con limitaciones documentadas en
[`docs/product/capability-status-matrix.md`](../../docs/product/capability-status-matrix.md)),
PWA offline, cola durable, idempotencia, RBAC, adjuntos locales, clima, alertas,
reportes, providers boundary, Lambda adapter (implementado en código; no
verificado ni desplegado en AWS).

### PLANNED P0 — Aprobado, no implementado

Despliegue AWS, Asistente AGROSBO (herramientas, voz, visión, escenarios),
colaboradores externos, SES, enlaces seguros, golden path.

### PLANNED P1 — Posterior a P0

Tienda pública de una finca, URL, QR, solicitudes sin registro, comparación,
WhatsApp wa.me, notas de voz offline, resumen hablado. Single-organization.

### OUT OF SCOPE / P2

Marketplace multi-organización, pagos, reputación, logística, mensajería en
tiempo real, WhatsApp Cloud API, multi-tenancy completo, diagnóstico
especializado, automatización financiera/contractual.

## Golden path (P0)

Consulta → agente → herramientas → navegación → borrador → confirmación → cola →
idempotencia → auditoría → SES → colaborador externo → evaluación visual →
escenario determinista.

## MUST

- MUST resolver flujo operativo de campo a acciones e historial.
- MUST funcionar offline para captura y sincronizar sin duplicar.
- MUST mostrar acciones concretas (alertas accionables), no solo tableros.
- MUST distinguir en toda comunicación: CURRENT / PLANNED P0 / PLANNED P1 / P2.
- MUST requerir confirmación antes de toda mutación del agente.

## MUST NOT

AGROSBO MUST NOT presentarse como: ERP terminado; certificadora; sistema oficial;
fuente infalible de asesoría agronómica; garantía de cumplimiento legal;
plataforma financiera; marketplace implementado; app con pagos activos; chatbot
omnisciente; diagnóstico definitivo; sistema que ejecuta acciones sin
confirmación.
