# AGROSBO — Visión y alcance

> Fuente canónica del alcance:
> [`./product-scope-v2.md`](./product-scope-v2.md).
> Este documento resume; no reemplaza el contrato.

## Visión

AGROSBO es una plataforma web offline-first que centraliza las operaciones de una
granja, coordina el trabajo de campo y convierte registros dispersos en acciones,
historial y evidencia operativa. Integra un agente operacional multimodal
(Asistente AGROSBO) como interfaz central de interacción.

## Usuarios

- **Propietario / encargado**: planifica, prioriza y decide.
- **Técnico / operario de campo**: captura datos en terreno, frecuentemente offline.
- **Rol financiero**: registra y consulta gastos y mano de obra.
- **Colaborador externo (P0)**: responde a tareas específicas sin cuenta completa.
- **(P1) Visitante / comprador**: accede a la tienda pública sin registro.

## Capacidades por horizonte

### CURRENT (implementado)
Core agrícola amplio: bloques, invernaderos, campañas, tareas, observaciones,
aplicaciones, inventario, riego, cosecha, gastos, apicultura, adjuntos, clima,
alertas, reportes CSV, mapa, PWA offline, cola durable, idempotencia, RBAC. Con
limitaciones documentadas: MemStorage parcial, mapa parcial, algunos dominios
PostgreSQL-only, ningún despliegue AWS. 165 pruebas. Detalle en
[`./capability-status-matrix.md`](./capability-status-matrix.md).

### PLANNED P0 (aprobado, no implementado)
Despliegue AWS, Asistente AGROSBO (agente multimodal con herramientas, voz,
visión y escenarios), colaboradores externos, SES, enlaces seguros, golden path.
Single-organization.

### PLANNED P1 (posterior a P0)
Tienda pública de una sola finca, URL, QR, solicitudes sin registro, comparación
de interesados, WhatsApp wa.me, notas de voz offline, resumen hablado.
Single-organization.

### OUT OF SCOPE / P2
Marketplace, pagos, reputación, logística, mensajería en tiempo real, WhatsApp
Cloud API, multi-tenancy completo, automatización financiera/contractual.
Full multitenancy es P2.

## Golden path

P0: consulta → agente → herramientas → navegación → borrador → confirmación →
cola offline → idempotencia → auditoría → SES → colaborador → evaluación visual →
escenario determinista.

P1: publicar → URL/QR → solicitud sin registro → comparar → WhatsApp humano.

Detalle en [`./golden-paths-p0-p1.md`](./golden-paths-p0-p1.md).

## Límites

AGROSBO no es ERP terminado, certificadora, sistema oficial, asesor infalible,
plataforma de pagos, marketplace implementado ni chatbot omnisciente.
Ver [`./product-scope-v2.md`](./product-scope-v2.md) §19.
