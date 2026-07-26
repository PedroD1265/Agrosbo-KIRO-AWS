# AGROSBO — Guion de demo del hackathon

> Fuente canónica: [`./product-scope-v2.md`](./product-scope-v2.md).
> Golden paths detallados: [`./golden-paths-p0-p1.md`](./golden-paths-p0-p1.md).
> Última actualización: julio 2026 (Fase 0).
> Estado del flujo integrado: **PLANNED** (no implementado como demo ejecutable).

## Problema

Una granja registra su operación en cuadernos y mensajes, con conectividad
intermitente. Los datos no se convierten en acciones ni en historial confiable.

## Usuario

Propietario/encargado (escritorio y móvil) y técnico de campo (móvil, offline).

## Escenario P0

Jornada operativa con el Asistente AGROSBO: consultar datos, actuar con
confirmación, capturar offline, sincronizar sin duplicar, colaborar con externos,
evaluar una foto y explorar un escenario de riego.

## Pasos de demo (golden path P0)

1. Login en entorno AWS objetivo (Cognito JWT).
2. Consulta al Asistente AGROSBO por texto o voz.
3. Agente lee datos reales vía herramientas (tareas, alertas, inventario).
4. Agente navega visiblemente a la sección relevante.
5. Agente prepara borrador de tarea.
6. Usuario confirma; mutación entra a cola offline.
7. Sincroniza idempotentemente (X-Idempotency-Key); no duplica.
8. Queda registrada en auditoría.
9. Agente prepara notificación a colaborador externo; usuario confirma.
10. SES acepta solicitud → sent (message ID almacenado). No implica entrega.
11. Eventos de notificación (no lineales): delivered puede llegar antes o después
    de opened_link; cada evento se registra independientemente.
12. Colaborador accede al enlace → opened_link (puede ser escáner; no prueba lectura).
13. Colaborador responde con acción explícita → responded.
14. Usuario sube fotografía agrícola.
15. Bedrock produce evaluación visual preliminar (con aviso de seguridad).
16. Usuario crea observación desde evaluación (borrador + confirmación).
17. Usuario consulta escenario de retraso de riego.
18. IrrigationDelayScenario calcula; LLM explica (no calcula).
19. Variante offline: pierde conexión → captura vía formulario → encolado en
    IndexedDB → recupera conexión → sincroniza sin duplicar.

## Evidencia técnica

- Cola offline durable (Dexie) con estados.
- Reconciliación temp→real y ausencia de duplicados.
- Alertas derivadas del estado real.
- Confirmación obligatoria antes de toda mutación interna propuesta por el
  agente. Respuestas externas, eventos SES, expiración TTL y revocación siguen
  sus propios mecanismos de autorización, validación, idempotencia y auditoría.
- Auditoría con metadata mínima.
- SES con semántica honesta de estados.
- Evaluación visual con aviso de seguridad y confianza.
- Escenario con supuestos, rango y confianza.
- 165 pruebas; quality gates en verde.

## Servicios AWS (narrativa objetivo)

Frontend en S3+CloudFront+OAC; API en Lambda tras API Gateway HTTP API; datos en
Aurora Serverless v2 vía Data API; adjuntos en S3; Cognito; Bedrock; Transcribe;
Polly; SES; Secrets Manager; CloudWatch; CDK. Amplify evaluado y descartado.

## Kiro (proceso)

Steering, Specs (EARS + Design + Tasks), ADRs 014–018, Hooks, checkpoints,
auditoría y runbook operativo guiaron la Fase 0 y toda la documentación.

## Límites

- El flujo integrado está PLANNED hasta ser implementado.
- P1 (tienda pública) no es parte obligatoria de la demo P0.
- No se usan cifras agrícolas o productivas inventadas.
- Ninguna capacidad se presenta como implementada sin evidencia verificable.
