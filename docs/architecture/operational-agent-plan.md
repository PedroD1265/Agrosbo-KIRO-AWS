# AGROSBO — Arquitectura del Agente Operacional

> Documento técnico principal del agente. Supersede
> [`./farm-assistant-plan.md`](./farm-assistant-plan.md).
>
> Fuente canónica de alcance:
> [`../product/product-scope-v2.md`](../product/product-scope-v2.md) §5.
>
> ADRs de referencia:
> [`../adr/015-agent-action-and-confirmation-model.md`](../adr/015-agent-action-and-confirmation-model.md),
> [`../adr/018-agricultural-intelligence-boundaries.md`](../adr/018-agricultural-intelligence-boundaries.md).
>
> Última actualización: julio 2026 (Fase 0, Checkpoint 0.6).

## 1. Visión general

El Asistente AGROSBO (operational farm agent) es la interfaz central de
interacción de la plataforma. Opera mediante herramientas estructuradas sobre
datos reales de la finca, presenta borradores visibles y solo ejecuta mutaciones
tras confirmación explícita del usuario.

## 2. Protocolo de comunicación

- **P0**: endpoint REST del agente. Ruta y contrato exactos se definirán en Spec
  21 (farm-operational-agent).
- **SSE**: puede evaluarse para transmitir progreso o texto parcial al cliente.
- **WebSocket**: fuera de P0; candidato para P2 si se requiere mensajería en
  tiempo real.
- Cada solicitud incluye el contexto de sesión del usuario (token Cognito JWT en
  producción; cookie local en desarrollo).
- El agente hereda los permisos del usuario; nunca obtiene permisos superiores.

## 3. Integración con Bedrock

- Amazon Bedrock con tool calling.
- El agente define un registro de herramientas (tool registry) con:
  - nombre;
  - descripción;
  - parámetros (schema Zod o equivalente);
  - tipo: lectura o escritura;
  - confirmación requerida: sí/no.
- Bedrock invoca herramientas según el contexto de la conversación.
- El resultado de cada herramienta se devuelve a Bedrock para composición de
  respuesta.

## 4. Herramientas de lectura (sin confirmación)

Ejemplos de herramientas que no requieren confirmación:

- `get_tasks` — tareas pendientes/vencidas por scope o usuario.
- `get_inventory_status` — stock actual y alertas de mínimo.
- `get_campaign_summary` — resumen de una campaña.
- `get_irrigation_events` — eventos de riego recientes y programados.
- `get_alerts` — alertas derivadas activas.
- `get_observations` — observaciones recientes por scope.
- `get_weather` — pronóstico actual.
- `navigate_to` — dirige la UI a una página/entidad específica.

Toda afirmación sobre el estado real de la finca requiere invocar una herramienta
de lectura. El agente indica cuando no consultó datos reales.

## 5. Herramientas de escritura (requieren confirmación)

Ejemplos de herramientas que requieren confirmación del usuario interno:

- `create_task` — prepara borrador de tarea.
- `update_task` — prepara modificación de tarea existente.
- `create_observation` — prepara observación.
- `adjust_inventory` — prepara movimiento de inventario.
- `send_collaboration_request` — prepara envío SES a colaborador externo.

### Flujo de escritura (usuarios internos)

```text
Agente propone acción
→ Herramienta prepara borrador (no ejecuta)
→ UI muestra borrador visible al usuario
→ Usuario confirma o descarta
→ Si confirma: mutación entra a cola offline (Dexie)
→ Cola sincroniza con X-Idempotency-Key
→ Ejecución determinista en servidor
→ Auditoría registrada
```

El servidor no puede ejecutar una mutación únicamente por decisión del LLM sin
que la PWA haya confirmado.

### Operaciones que no requieren confirmación PWA

Las siguientes operaciones se resuelven sin el ciclo de confirmación de la PWA,
pero deben ser idempotentes, validadas y auditadas:

- **Respuestas de colaboradores externos**: autorizadas por token válido y acción
  explícita en la vista pública. Ver
  [`./collaboration-model.md`](./collaboration-model.md).
- **Eventos externos verificables**: eventos SES, expiración por TTL y
  revocación actualizan estado sin confirmación PWA.

Ninguna de estas excepciones permite que el LLM ejecute una mutación autónoma.

## 6. Acciones sensibles

Las siguientes requieren confirmación reforzada (UI distinguible):

- Gastos y costos.
- Cambios de inventario.
- Eliminaciones.
- Publicaciones públicas (P1).
- Comunicaciones externas (SES, enlaces).
- Aceptación o rechazo de interesados (P1).
- Cualquier acción con efecto contractual o financiero.

## 7. Voz

- **STT**: Amazon Transcribe (push-to-talk; streaming preferido; clip como
  fallback).
- **TTS**: Amazon Polly (respuestas habladas opcionales).
- Texto siempre visible.
- Transcripción editable antes de enviar al agente.
- Confirmación de ambigüedades en nombres, fechas, lugares y cantidades.
- Voz requiere conectividad; sin conexión se deshabilita.
- Notas de voz offline son P1.

## 8. Evaluación visual

- Bedrock multimodal procesa fotografías agrícolas.
- Resultado: síntomas, causas posibles, información faltante, inspecciones
  recomendadas, urgencia, confianza, aviso de seguridad.
- Es evaluación preliminar; nunca diagnóstico definitivo.
- No Rekognition como motor principal; no modelo custom P0.
- El usuario puede crear observación o tarea desde la evaluación (flujo
  borrador → confirmación estándar).

## 9. IrrigationDelayScenario

Módulo determinista separado del irrigation advisor actual
(`irrigationAdvisor.ts`). Puede reutilizar sus datos y reglas, pero produce un
resultado estructurado multi-caso.

### Salida obligatoria

| Campo | Descripción |
| --- | --- |
| baseline | Estado actual sin intervención |
| bestCase | Mejor escenario posible |
| expectedCase | Escenario más probable |
| worstCase | Peor escenario razonable |
| range | Rango numérico del impacto |
| assumptions | Supuestos utilizados |
| dataUsed | Datos reales consumidos |
| missingData | Información que mejoraría la precisión |
| confidence | Nivel de confianza (high/medium/low) |

### Rol del LLM

- Explica los resultados en lenguaje natural.
- Resume incertidumbre y supuestos.
- No realiza el cálculo principal.
- No garantiza resultados.

## 10. Auditoría

Eventos auditables con metadata mínima:

- Usuario, herramienta, timestamp, duración, resultado técnico.
- Identificadores de entidades afectadas.
- Resultado resumido o referencia cuando corresponda.

No se almacena:

- Token raw, secreto, contraseña o credencial.
- Audio, imagen completa o payload sensible innecesario.
- Parámetros sensibles sin redacción.

Los eventos no se modifican mediante flujos normales de producto. Se preserva
trazabilidad. Retención, archivado y eliminación controlada se definirán en la
Spec de seguridad y confiabilidad (Spec 30).

## 11. RBAC y seguridad

- El agente actúa con los permisos efectivos del usuario que lo invoca.
- Nunca obtiene permisos propios superiores.
- Herramientas respetan RBAC: un operario no puede ajustar inventario vía agente
  si no tiene `inventory:write`.
- En producción, el token Cognito JWT identifica al usuario.
- En desarrollo, la cookie HMAC identifica al usuario (AUTH_ENFORCEMENT=off omite
  guards, solo para dev).

## 12. Degradación

- Sin conexión: agente y voz no disponibles; captura offline sigue funcionando.
- Bedrock no disponible: evaluación visual no posible; usuario informado.
- Transcribe/Polly no disponibles: interfaz de texto sigue funcional.
- SES rechaza envío: fallo técnico registrado; usuario informado; puede
  reintentar el envío.

## 13. Exclusiones (fuera de este documento)

- Endpoints espaciales: deuda técnica para Spec futura; no bloquean P0.
- Multi-tenancy completo: P2.
- Mensajería en tiempo real (WebSocket): P2.
- Diagnóstico agronómico especializado: prohibido (ADR 018).
- Automatización financiera/contractual: prohibido.

## 14. Referencias

- [`../product/product-scope-v2.md`](../product/product-scope-v2.md) §5, §11,
  §12, §13.
- [`../adr/015-agent-action-and-confirmation-model.md`](../adr/015-agent-action-and-confirmation-model.md).
- [`../adr/018-agricultural-intelligence-boundaries.md`](../adr/018-agricultural-intelligence-boundaries.md).
- [`./collaboration-model.md`](./collaboration-model.md).
