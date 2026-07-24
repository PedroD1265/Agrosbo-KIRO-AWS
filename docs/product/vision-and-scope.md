# AGROSBO - Visión y alcance

## Visión

AGROSBO es una plataforma web offline-first que centraliza las operaciones de una
granja, coordina el trabajo de campo y convierte registros dispersos en acciones,
historial y evidencia operativa. Aspira a crecer desde la gestión operativa hacia
el comercio/servicios agrícolas y un copiloto de datos, sin dejar de ser útil y
confiable en condiciones de conectividad limitada.

## Usuarios

- **Propietario / encargado**: planifica, prioriza y decide con base en alertas,
  costos y reportes.
- **Técnico / operario de campo**: captura datos en terreno, a menudo offline.
- **Rol financiero**: registra y consulta gastos y mano de obra.
- **(Futuro) comprador y proveedor de servicios/maquinaria**: contraparte del
  comercio agrícola.

## Problemas

- Información dispersa y no accionable.
- Conectividad intermitente en campo.
- Falta de historial y evidencia operativa consolidada.
- Dificultad para convertir datos en decisiones y tareas.

## Capacidades por horizonte

### Implemented now
Gestión operativa: bloques, invernaderos, campañas, tareas, observaciones,
aplicaciones, inventario y movimientos, riego, clima, alertas, cosecha, gastos y
mano de obra, reportes CSV, mapa espacial, trabajo offline, auth + RBAC.

### Being stabilized
Documentación alineada, tests RBAC, baseline versionable, cobertura de modo
memoria documentada.

### Hackathon target
Despliegue AWS serverless reproducible; adjuntos en S3; endpoints espaciales
(planificados en su Spec).

### Planned next (diferenciadores)
Copiloto de datos de solo lectura; primer flujo de solicitud de servicio → orden
de trabajo.

### Long-term vision
Marketplace, múltiples proveedores, mensajería, notificaciones, pagos,
reputación, logística, automatización avanzada.

## Golden path

Login → Today → revisar granja/bloques/tareas/inventario/clima/alertas → abrir
campaña o parcela → perder conexión → registrar offline → guardar en IndexedDB →
ver estado pendiente → recuperar conexión → sincronizar sin duplicar → ver
impacto → exportar reporte. (Pasos de asistente/servicios: roadmap.)

## Límites

Ver `.kiro/steering/product.md` (sección MUST NOT). AGROSBO no es ERP terminado,
certificadora, sistema oficial, asesor infalible, plataforma de pagos ni
marketplace implementado.
