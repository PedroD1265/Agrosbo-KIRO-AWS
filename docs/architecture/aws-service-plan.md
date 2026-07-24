# AGROSBO - Plan de servicios AWS

Cada servicio se justifica por una necesidad real del código. No se añaden
servicios por cantidad. Fases: **now** (dev, sin AWS), **hackathon** (target),
**future** (diferido).

| Servicio | Necesidad | Evidencia (código) | Fase | Obligatorio | Recomendado | Diferido | Costo rel. | Riesgo | Fallback | Criterio para activarlo |
|---|---|---|---|---|---|---|---|---|---|---|
| Aurora PostgreSQL Serverless v2 | Fuente de verdad | `dbStorage.ts`, `db.ts` | hackathon | Sí | — | — | Medio | Medio | Postgres local | Despliegue del core |
| RDS Data API | Acceso DB sin pool en Lambda | `db.ts` (`aws-data-api/pg`) | hackathon | Sí (si Lambda) | — | — | Bajo | Bajo | pool pg / Fargate | Elegir Lambda |
| Lambda | Ejecutar Express | `handlers/index.ts` | hackathon | Sí | — | — | Bajo | Medio | Fargate | Cerrar prerequisitos ADR 007 |
| API Gateway HTTP API | Front del Lambda | (target) | hackathon | Sí | — | — | Bajo | Bajo | ALB | Con Lambda |
| S3 (estático) | Hosting web | `web` build | hackathon | Sí | — | — | Bajo | Bajo | express.static | Despliegue web |
| CloudFront | Origen único (cookies + `/api` relativo) | `queryClient.ts`, `auth.ts` | hackathon | Sí | — | — | Bajo | Medio | — | Despliegue |
| S3 (adjuntos) | Reemplazo de disco local | `attachments.ts` | hackathon | Sí (si Lambda) | — | — | Bajo | Alto | disco (Fargate) | Migración adjuntos |
| Secrets Manager | `SESSION_SECRET`, credenciales | `env.ts`, `auth.ts` | hackathon | — | Sí | — | Bajo | Medio | env local | Despliegue |
| CloudWatch | Logs/métricas | `logger.ts` | hackathon | — | Sí | — | Bajo | Bajo | consola | Despliegue |
| CDK | IaC reproducible | `infra/` (placeholder) | hackathon | — | Sí | — | — | Medio | manual | Despliegue |
| ACM | HTTPS/cert | (target) | hackathon | — | Sí | — | Negligible | Bajo | — | Dominio/CloudFront |
| ECS Fargate + ALB | Fallback de cómputo | Express escucha en PORT | hackathon (fallback) | — | — | — | Medio | Bajo | — | Si Lambda no viable a tiempo |
| Cognito | Identidad gestionada | — | future | — | — | Sí | Bajo | Bajo | cookie | Federación/MFA/tenancy (ADR 008) |
| Bedrock | Copiloto | — | future | — | — | Sí | Medio | Medio | reglas | Spec del asistente |
| Textract | Extracción documental | — (solo ADR 005) | future | — | — | Sí | — | — | — | Spec que lo justifique |
| EventBridge Scheduler | Limpiezas/refresco | limpiezas inline hoy | future | — | — | Sí | Bajo | Bajo | inline | Job real necesario |
| SQS | Colas backend | — | future | — | — | Sí | Bajo | Bajo | — | Trabajo asíncrono real |
| API Gateway WebSocket | Mensajería tiempo real | — | future | — | — | Sí | Bajo | Medio | polling | Spec de mensajería |
| SES | Notificaciones por correo | — | future | — | — | Sí | Bajo | Bajo | — | Notificaciones |
| WAF | Perímetro | — | future | — | — | Sí | Bajo | Bajo | — | Endurecimiento |
| Route 53 | Dominio propio | — | future | — | — | Sí | Bajo | Bajo | — | Dominio propio |
| RDS Proxy | Pooling | evitado por Data API | discard (MVP) | — | — | — | — | — | Data API | Límite Data API |
| DynamoDB | — | relacional en uso | discard | — | — | — | — | — | — | No aplica |
| Step Functions | Orquestación | sin flujos | discard | — | — | — | — | — | — | No aplica |

## Resumen

- **Obligatorios (hackathon)**: Aurora SV2, Data API, Lambda, API Gateway, S3
  (estático), CloudFront, S3 (adjuntos si Lambda).
- **Recomendados**: Secrets Manager, CloudWatch, CDK, ACM.
- **Diferidos**: Cognito, Bedrock, Textract, EventBridge, SQS, WebSocket, SES,
  WAF, Route 53.
- **Descartados (MVP)**: RDS Proxy, DynamoDB, Step Functions, App Runner.
