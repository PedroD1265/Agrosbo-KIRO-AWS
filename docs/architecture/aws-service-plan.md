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
| Amplify Hosting | Hosting frontend PWA por rama | web build estático | hackathon | Sí | — | — | Bajo | Bajo | express.static | Despliegue frontend |
| S3 (estático) | Backend de Amplify Hosting (automático) | — | hackathon | (via Amplify) | — | — | Bajo | Bajo | — | Con Amplify |
| CloudFront | Solo si se necesita para API/adjuntos (Amplify incluye CDN) | — | hackathon (opc) | — | — | Sí | Bajo | Bajo | — | Necesidad demostrada |
| S3 (adjuntos) | Reemplazo de disco local | `attachments.ts` | hackathon | Sí (si Lambda) | — | — | Bajo | Alto | disco (Fargate) | Migración adjuntos |
| Secrets Manager | `SESSION_SECRET`, credenciales | `env.ts`, `auth.ts` | hackathon | — | Sí | — | Bajo | Medio | env local | Despliegue |
| CloudWatch | Logs/métricas | `logger.ts` | hackathon | — | Sí | — | Bajo | Bajo | consola | Despliegue |
| CDK | IaC reproducible | `infra/` (placeholder) | hackathon | — | Sí | — | — | Medio | manual | Despliegue |
| ACM | HTTPS/cert | (target) | hackathon | — | Sí | — | Negligible | Bajo | — | Dominio/CloudFront |
| ECS Fargate + ALB | Fallback de cómputo | Express escucha en PORT | hackathon (fallback) | — | — | — | Medio | Bajo | — | Si Lambda no viable a tiempo |
| Cognito | Identidad gestionada (staging/prod) | ADR 010 (target) | hackathon | Sí | — | — | Bajo | Medio | local-session | Spec auth-tenancy |
| Bedrock | Copiloto de datos (diferenciador aprobado) | farm-assistant-plan.md | hackathon (diff) | — | Sí | — | Medio | Medio | reglas | Spec del asistente |
| Textract | Extracción documental (candidato primario) | ADR 013 | hackathon (diff) | — | — | Sí | Bajo | Bajo | — | Benchmark (ADR 013) |
| EventBridge Scheduler | Tareas periódicas | limpiezas inline hoy | future | — | — | Sí | Bajo | Bajo | inline | Job real necesario |
| Azure AI Doc Intelligence | Extracción documental (candidato comparativo) | ADR 013 | hackathon (diff) | — | — | Sí | Bajo | Bajo | — | Benchmark (ADR 013) |
| SQS | Colas backend | — | future | — | — | Sí | Bajo | Bajo | — | Trabajo asíncrono real |
| API Gateway WebSocket | Mensajería tiempo real | — | future | — | — | Sí | Bajo | Medio | polling | Spec de mensajería |
| SES | Notificaciones por correo | — | future | — | — | Sí | Bajo | Bajo | — | Notificaciones |
| WAF | Perímetro | — | future | — | — | Sí | Bajo | Bajo | — | Endurecimiento |
| Route 53 | Dominio propio | — | future | — | — | Sí | Bajo | Bajo | — | Dominio propio |
| RDS Proxy | Pooling | evitado por Data API | discard (MVP) | — | — | — | — | — | Data API | Límite Data API |
| DynamoDB | — | relacional en uso | discard | — | — | — | — | — | — | No aplica |
| Step Functions | Orquestación | sin flujos | discard | — | — | — | — | — | — | No aplica |

## Resumen

- **Obligatorios (hackathon)**: Aurora SV2, Data API, Lambda, API Gateway,
  Amplify Hosting, S3 (adjuntos), Cognito.
- **Recomendados**: Secrets Manager, CloudWatch, CDK, ACM.
- **Diferenciadores aprobados**: Bedrock (copiloto), Textract o Azure DI
  (extracción, benchmark pendiente).
- **Diferidos**: EventBridge, SQS, WebSocket, SES, WAF, Route 53.
- **Descartados (MVP)**: RDS Proxy, DynamoDB, Step Functions, App Runner.
