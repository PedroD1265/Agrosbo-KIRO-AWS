# AGROSBO - Alcance del hackathon

Responsabilidad: frontera de alcance, foco de demo, uso de AWS y de Kiro.
Reemplaza el foco previo (revisión de embarque cafetero); ver ADR 006.

## Prioridades

1. **Demo terminable** sobre inflar arquitectura.
2. **AWS con justificación** (cada servicio resuelve una necesidad real).
3. **Kiro como proceso central** de ingeniería.
4. **PWA / offline** como diferenciador técnico verificable.
5. **Estabilidad** y calidad (quality gates verdes).
6. **Narrativa** y **evidencia** concreta.
7. Diferenciadores **solo después** de estabilizar el core.

## Core obligatorio de la demo

Autenticación y RBAC; granja, bloques y mapa; campañas; tareas; observaciones;
aplicaciones; inventario; cosecha; costos básicos; alertas; reportes;
sincronización offline; despliegue AWS reproducible; datos sintéticos
consistentes.

## Diferenciadores candidatos (solo tras el core estable)

- Consulta conversacional de datos mediante herramientas controladas (lectura).
- Primer flujo estructurado de solicitud de servicio agrícola.
- Creación de una orden de trabajo con actualización visible en Today.

No son obligatorios en esta fase.

## Visión futura (fuera del alcance del hackathon)

Marketplace completo, múltiples proveedores, mensajería en tiempo real,
notificaciones externas, pagos, reputación, logística, asesoría avanzada,
automatización completa por IA.

## Uso de AWS (objetivo del hackathon)

S3 (estático) + CloudFront + API Gateway HTTP API + Lambda (Express serverless)
+ Aurora PostgreSQL Serverless v2 + RDS Data API + S3 (adjuntos) + URLs
prefirmadas + Secrets Manager + CloudWatch + CDK.

- MUST justificar cada servicio por el código.
- MUST NOT usar Cognito, Bedrock, Textract, EventBridge, SQS o WebSocket sin una
  Spec que lo requiera.
- MUST NOT sumar servicios solo por cantidad.

## Uso de Kiro (demostrable)

Steering, Specs (Requirements EARS + Design + Tasks), Hooks deterministas,
checkpoints, auditoría arquitectónica, revisión incremental, decisiones
registradas (ADRs) y trazabilidad requerimiento→diseño→tarea→código.

- MUST documentar solo usos reales o aprobados.
- MUST NOT inventar estadísticas de productividad.

## Métricas verificables de la demo

- Reintentos offline sin duplicados (idempotencia).
- Actualización de datos relacionados tras sincronizar.
- Alertas accionables derivadas del estado real.
- Reporte CSV exportable.
- Tiempo medido sobre un dataset sintético consistente.

- MUST NOT usar cifras inventadas sobre operaciones reales.
