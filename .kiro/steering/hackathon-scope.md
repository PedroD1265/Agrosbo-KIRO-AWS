# AGROSBO — Alcance del hackathon

Responsabilidad: frontera de alcance, foco de demo, uso de AWS y de Kiro.
Fuente canónica: [`docs/product/product-scope-v2.md`](../../docs/product/product-scope-v2.md).

## Prioridades

1. **P0 terminable** sobre inflar arquitectura.
2. **AWS con justificación** (cada servicio resuelve necesidad real).
3. **Kiro como proceso central** de ingeniería.
4. **PWA / offline** como diferenciador técnico verificable.
5. **Agente operacional** como diferenciador de producto.
6. **Estabilidad** y calidad (gates verdes, 165 pruebas).
7. **Narrativa** y **evidencia** concreta.

## Core P0 obligatorio

- Despliegue AWS (S3+CF+OAC, Lambda, Aurora, Cognito, CDK).
- Asistente AGROSBO (Bedrock, herramientas, confirmación, REST).
- Voz (Transcribe STT, Polly TTS, push-to-talk).
- Colaboradores externos (token opaco, SES, estados honestos).
- Evaluación visual preliminar (Bedrock multimodal).
- IrrigationDelayScenario (motor determinista).
- Golden path reproducible con datos sintéticos.
- Seguridad, auditoría, observabilidad, límites de costo.
- Documentación y trazabilidad Kiro.

## P1 (posterior a Spec 31)

- Tienda pública de una finca (URL, QR, solicitudes sin registro).
- Comparación de interesados (decisión humana).
- WhatsApp wa.me prellenado (envío humano).
- Notas de voz offline.
- Resumen hablado del día.

## P2 (no bloqueante)

Marketplace, pagos, reputación, logística, mensajería realtime, WhatsApp Cloud
API, multi-tenancy completo, automatización avanzada.

## AWS target P0

- S3 privado + CloudFront + OAC.
- API Gateway HTTP API.
- Lambda.
- Aurora Serverless v2 + Data API.
- Cognito.
- S3 adjuntos.
- Bedrock.
- Transcribe.
- Polly.
- SES.
- Secrets Manager.
- CloudWatch.
- CDK.

Notas:

- Amplify Hosting: evaluado y descartado (ADR 016).
- Topología CloudFront /api/*: no decidida; se evalúa en Spec.
- WAF: solo si riesgo y presupuesto lo justifican.
- Ningún servicio está desplegado actualmente.

## Baseline verificado

- 165 pruebas (132 unitarias + 7 MemStorage + 26 integración PG).
- Quality gates: format, encoding, lint (0 errores), typecheck, build.
- cloud-services-readiness completada (PR #2).

## Uso de Kiro

Steering, Specs (EARS + Design + Tasks), Hooks deterministas, ADRs 014–018,
checkpoints, runbook, auditoría y trazabilidad.

- MUST documentar solo usos reales o aprobados.
- MUST NOT inventar estadísticas de productividad.

## Métricas verificables

- Mutaciones internas propuestas por el agente ejecutadas sin confirmación
  explícita: 0.
- SQL generado ejecutado: 0.
- Duplicados por reintento: 0 en pruebas.
- Golden path reproducible.
- Presupuesto controlado con alarmas.
- Gates verdes.
- Documentación coherente con product-scope-v2.

## MUST NOT

- MUST NOT usar cifras inventadas.
- MUST NOT presentar capacidades futuras como implementadas.
- MUST NOT declarar despliegue AWS sin evidencia.
- MUST NOT tratar P1 o P2 como parte de la demo P0.
