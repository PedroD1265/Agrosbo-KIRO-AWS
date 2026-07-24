# AGROSBO - Guion de demo del hackathon

## Problema

Una granja registra su operación en cuadernos y mensajes, con conectividad
intermitente. Los datos no se convierten en acciones ni en historial confiable.

## Usuario

Propietario/encargado (escritorio y móvil) y técnico de campo (móvil, offline).

## Escenario

Jornada operativa: revisar el estado de la granja, actuar sobre lo urgente,
capturar trabajo en campo sin señal y consolidar todo al volver a tener conexión.

## Pasos de demo (golden path)

1. Login (cookie de sesión).
2. Abrir **Today**: tareas del día, alertas accionables, clima.
3. Revisar bloques/invernaderos e inventario; abrir una campaña o parcela.
4. **Simular pérdida de conexión.**
5. Registrar una observación y una tarea (o aplicación/cosecha) offline.
6. Mostrar la mutación en IndexedDB y el **estado pendiente** en la UI.
7. **Recuperar conexión**: la cola sincroniza con `X-Idempotency-Key`.
8. Mostrar que un reintento **no duplica** (idempotencia).
9. Ver el impacto en Today, inventario y campaña.
10. Exportar un **reporte CSV** operativo.

## Evidencia técnica a mostrar

- Cola offline en IndexedDB (Dexie) con estados.
- Reconciliación temp→real y ausencia de duplicados.
- Alertas derivadas del estado real.
- Reporte CSV generado por el servidor.
- Quality gates en verde (format/lint/typecheck/test/build).

## AWS (narrativa objetivo)

Frontend en S3 + CloudFront; API en Lambda (Express serverless) tras API Gateway;
datos en Aurora Serverless v2 vía Data API; adjuntos en S3; secretos en Secrets
Manager; logs en CloudWatch; infraestructura como código con CDK. Cada servicio
resuelve una necesidad concreta (ver `docs/architecture/aws-service-plan.md`).

## Kiro (proceso)

Steering, Specs (EARS + Design + Tasks), ADRs, Hooks deterministas, auditoría
arquitectónica y checkpoints guiaron el desarrollo y esta estabilización.

## Flujo diferenciador futuro (roadmap, NO implementado)

Preguntar al asistente qué requiere atención → herramientas de solo lectura →
datos reales → generar una solicitud de servicio → cotización → orden de trabajo.
Se presenta como visión, no como capacidad actual.

## Cierre narrativo

AGROSBO convierte la operación diaria de la granja en acciones e historial, con
soporte offline real, y está preparada para crecer hacia comercio, servicios y un
copiloto de datos.
