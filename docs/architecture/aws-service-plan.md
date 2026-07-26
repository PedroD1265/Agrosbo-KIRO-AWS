# AGROSBO — Plan de servicios AWS

Cada servicio se justifica por una necesidad real. No se añaden servicios por
cantidad. Clasificación por estado actual y horizonte.

> Fuente canónica: [`../product/product-scope-v2.md`](../product/product-scope-v2.md).
> ADR de hosting: [`../adr/016-hosting-s3-cloudfront-oac.md`](../adr/016-hosting-s3-cloudfront-oac.md).
> Última actualización: julio 2026 (Fase 0).

## Servicios PLANNED P0

| Servicio | Necesidad | Estado actual | Criterio para activarlo |
|---|---|---|---|
| S3 privado (frontend) | Hosting del build estático | No desplegado | CDK infra baseline |
| CloudFront + OAC | CDN para frontend; control de cache/headers | No desplegado | CDK infra baseline |
| API Gateway HTTP API | Entrada pública a la API | No desplegado | CDK core deployment |
| Lambda | Cómputo Express serverless | IMPLEMENTED IN CODE; no verificado ni desplegado en AWS | CDK core deployment |
| Aurora PostgreSQL Serverless v2 | Base de datos | Solo PG local verificado | CDK infra baseline |
| RDS Data API | Acceso DB sin pools en Lambda | PARTIAL; camino presente en código; no probado contra Aurora | Con Aurora |
| Amazon Cognito | Identidad gestionada (staging/prod) | Interface PLACEHOLDER | Spec 20 |
| S3 privado (adjuntos) | Reemplazo de disco local | Interface PLACEHOLDER | Spec 20 |
| Amazon Bedrock | Agente multimodal (tool calling + visión) | No existe código | Spec 17 spike + Spec 21 |
| Amazon Transcribe | STT para el agente | No existe código | Spec 17 spike + Spec 23 |
| Amazon Polly | TTS para el agente | No existe código | Spec 23 |
| Amazon SES | Correos de notificación y enlaces | No existe código | Spec 24 |
| Secrets Manager | Secretos de aplicación | No desplegado | CDK infra baseline |
| CloudWatch | Logs y métricas básicas | Logger JSON local | CDK infra baseline |
| CDK | IaC reproducible | Placeholder vacío | Spec 18 |

## Servicios solo desarrollo/tests

| Servicio | Uso |
|---|---|
| PostgreSQL local | Dev y CI |
| Cookie HMAC local | Dev y tests (AUTH_ENFORCEMENT=off) |
| Disco local (uploads/) | Dev (adjuntos) |

## Alternativa evaluada y descartada

| Servicio | Motivo de descarte | ADR |
|---|---|---|
| Amplify Hosting | Menor control sobre cache/headers/orígenes; acoplamiento innecesario | 016 |

## Servicios evitados salvo justificación

NAT Gateway, ECS/Fargate, RDS Proxy, OpenSearch, DynamoDB, Step Functions,
Kinesis, API Gateway WebSocket, SageMaker, modelos provisionados de Bedrock.

WAF de pago: solo si existe riesgo demostrado y presupuesto que lo justifique.

## Servicios P1

| Servicio | Necesidad |
|---|---|
| (Ningún servicio nuevo obligatorio) | P1 reutiliza infraestructura P0 |

## Servicios P2 / Future

EventBridge Scheduler, SQS, API Gateway WebSocket, Route 53, WAF.

> Nota: conseguir acceso SES de producción para enviar a colaboradores externos
> reales es un requisito P0. Solo el escalamiento a mayor volumen o capacidades
> avanzadas de email quedan como trabajo futuro.

## Notas

- SES puede iniciar en sandbox; destinatarios restringidos hasta acceso de
  producción. Conseguir acceso de producción para enviar a externos reales es
  requisito P0.
- La topología CloudFront (enrutar /api/* vs URL separada) se decide en Spec de
  infraestructura.
- El presupuesto no puede depender de Free Tier como plan de sostenibilidad.
- Ningún servicio está desplegado actualmente.
- Lambda adapter: implementado en código; no verificado ni desplegado en AWS.
- RDS Data API: implementación parcial; camino presente en código; no probado
  contra Aurora real; no desplegado.
