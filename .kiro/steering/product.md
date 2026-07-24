# AGROSBO - Producto

Responsabilidad: definir qué es y qué NO es AGROSBO. Fuente única de la intención
de producto. Reemplaza la definición previa de "trazabilidad de café" (ver ADR
006).

## Qué es

AGROSBO es una plataforma web **offline-first** para gestionar operaciones
agrícolas: centraliza la información de la granja, coordina el trabajo de campo y
convierte registros dispersos en acciones, historial y evidencia operativa.

## Usuarios

- **Propietario / encargado**: planifica campañas, revisa alertas, costos y
  reportes; decide acciones (escritorio y móvil).
- **Técnico / operario de campo**: registra observaciones, tareas, aplicaciones,
  riego, cosecha e inventario, frecuentemente **sin conexión**.
- **Rol financiero**: registra y revisa gastos y mano de obra.
- (Futuro) comprador, proveedor de servicios/maquinaria: contraparte del
  comercio agrícola. NO implementado.

## Problemas que resuelve

- Datos dispersos y no accionables.
- Conectividad intermitente en campo.
- Falta de historial y evidencia operativa consolidada.

## Capacidades (con estado)

Distinguir SIEMPRE el estado. No declarar implementado algo por tener nombre,
pantalla, tipo o helper.

### A. Gestión integral de la granja — Implemented now / Being stabilized
Granjas, bloques, invernaderos, campañas, cultivos, tareas, observaciones,
aplicaciones agrícolas, inventario y movimientos, riego, clima, alertas,
cosecha, costos, mano de obra, reportes, capa espacial (mapa), trabajo offline.

### B. Comercio y servicios agrícolas — Long-term vision (NO implementado)
Publicación de productos, ofertas y solicitudes de compra, proveedores de
maquinaria, solicitudes de trabajo, cotizaciones, órdenes de trabajo, agenda,
seguimiento, mensajería.

### C. Copiloto conversacional — Planned next / Long-term (NO implementado)
Consulta de datos reales de la granja mediante herramientas autorizadas
(solo lectura primero), con confirmación humana antes de cualquier cambio.

## Golden path (demo)

Login → Today → revisar granja/bloques/tareas/inventario/clima/alertas → abrir
campaña o parcela → perder conexión → registrar observación/tarea/aplicación/
cosecha offline → guardar en IndexedDB → ver estado pendiente → recuperar
conexión → sincronizar sin duplicar → ver impacto en Today/campaña/inventario/
reportes → exportar reporte CSV.

Pasos 14-19 (asistente, solicitud de servicio, cotización, orden) son **roadmap**.

## MUST

- MUST resolver un flujo operativo conectado de campo a acciones e historial.
- MUST funcionar offline para captura de campo y sincronizar sin duplicar.
- MUST mostrar acciones concretas (alertas accionables), no solo tableros.
- MUST distinguir en toda comunicación: implemented / stabilizing / target /
  planned / vision / deferred.

## MUST NOT (límites de comunicación)

AGROSBO MUST NOT presentarse como: ERP genérico terminado; certificadora;
sistema oficial gubernamental; fuente infalible de asesoría agronómica; sistema
que garantiza cumplimiento legal; plataforma financiera; marketplace
implementado; app con pagos activos; chatbot omnisciente; colección de pantallas
desconectadas; app con capacidades que aún no existen.
