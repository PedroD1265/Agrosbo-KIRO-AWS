# AGROSBO — Golden Paths P0 y P1

> Fuente canónica: [`./product-scope-v2.md`](./product-scope-v2.md) §16.
>
> Última actualización: julio 2026 (Fase 0, Checkpoint 0.4).
>
> Estado: PLANNED. Ningún paso está implementado como flujo integrado a esta
> fecha; los componentes base (CRUD, cola offline, idempotencia) existen.

## P0 — Flujo operativo con agente

### Precondiciones

- App desplegada en AWS (S3+CF+OAC, Lambda, Aurora).
- Usuario autenticado (Cognito JWT en producción).
- Datos sintéticos de demo cargados (seed idempotente).
- Conexión activa (agente requiere conectividad).

### Pasos

| # | Actor | Acción | Resultado observable |
| --- | --- | --- | --- |
| 1 | Usuario | Abre la app y consulta al Asistente AGROSBO por texto | Interfaz de chat visible |
| 2 | Agente | Lee datos reales vía herramientas (ej. tareas pendientes) | Respuesta basada en datos consultados |
| 3 | Agente | Navega visiblemente a la sección relevante | UI muestra la página/entidad |
| 4 | Agente | Prepara borrador de tarea nueva | Borrador visible en UI |
| 5 | Usuario | Revisa y confirma | Mutación entra a la cola offline (Dexie) |
| 6 | Sistema | Sincroniza idempotentemente (X-Idempotency-Key) | Tarea creada en servidor sin duplicar |
| 7 | Sistema | Registra en auditoría | Acción trazable |
| 8 | Usuario | Solicita enviar tarea a colaborador externo | Agente prepara borrador de notificación |
| 9 | Usuario | Confirma envío | Sistema solicita envío a SES |
| 10 | Sistema | SES acepta solicitud; estado → sent (message ID almacenado) | No implica entrega |
| 11 | Sistema | SES reporta evento de entrega; estado → delivered | Aceptación por servidor destino; no implica lectura |
| 12 | Colaborador | Accede al enlace seguro | Endpoint recibe solicitud válida; estado → opened_link (puede ser escáner automático) |
| 13 | Colaborador | Responde (acepta/rechaza/aclara) | Estado → responded; respuesta registrada |
| 14 | Usuario | Ve estado actualizado | Historial de eventos visible |
| 15 | Usuario | Sube fotografía agrícola | Foto enviada a Bedrock multimodal |
| 16 | Agente | Produce evaluación visual preliminar | Síntomas, causas, urgencia, confianza, aviso de seguridad |
| 17 | Usuario | Crea observación desde evaluación (confirma borrador) | Observación registrada vía cola offline |
| 18 | Usuario | Consulta "¿qué pasa si retraso el riego 3 días?" | IrrigationDelayScenario calcula |
| 19 | Agente | Explica escenarios | baseline, bestCase, expectedCase, worstCase, range, assumptions, dataUsed, missingData, confidence |

### Variante con voz

| # | Actor | Acción | Resultado observable |
| --- | --- | --- | --- |
| 1v | Usuario | Presiona push-to-talk y dice instrucción | Transcribe procesa; transcripción visible y editable |
| 2v | Usuario | Confirma transcripción (o edita) | Instrucción enviada al agente |
| 3v | Agente | Responde con texto + audio (Polly) | Texto siempre visible; audio reproducible |

### Variante offline (captura de datos sin agente)

| # | Actor | Acción | Resultado observable |
| --- | --- | --- | --- |
| 1o | Usuario | Pierde conexión | Indicador "sin conexión" visible |
| 2o | Sistema | Agente y voz se deshabilitan | UI muestra estado no disponible |
| 3o | Usuario | Registra observación/tarea/cosecha vía formulario | Mutación encolada en IndexedDB (durable) |
| 4o | Sistema | Muestra estado pendiente en UI | Badge de pendientes visible |
| 5o | Usuario | Recupera conexión | Cola se sincroniza automáticamente |
| 6o | Sistema | Idempotencia previene duplicados | Sin registros duplicados |
| 7o | Sistema | Reconcilia IDs temporales | Referencias actualizadas |

## Fallbacks verificables

| Escenario | Comportamiento esperado |
| --- | --- |
| SES en sandbox o destinatario no autorizado | Si SES rechaza la solicitud, no se registra sent; el sistema conserva el intento como fallo técnico registrado; el usuario recibe un mensaje claro; puede corregirse destinatario o configuración y reintentarse; sent solo se registra cuando SES acepta y devuelve message ID; delivered solo después de evento verificable |
| Agente/voz sin conexión | Interfaz muestra "sin conexión"; funciones de agente y voz deshabilitadas; captura offline disponible |
| Bedrock no disponible | Evaluación visual no posible; usuario informado; puede registrar observación manual |
| Token expirado o revocado | Endpoint retorna error; colaborador ve mensaje de expiración |
| Mutación pendiente de sincronización | Badge visible; mutación se reintenta con backoff; no se pierde |
| Data no cacheada y sin conexión | Vista muestra estado vacío o indicador de carga; no se inventan datos |

## P1 — Flujo tienda pública

### Precondiciones

- P0 estable y desplegado.
- Productor tiene productos publicables (inventario/cosecha con oferta habilitada).
- URL pública de la finca configurada.
- Single-organization.

### Pasos

| # | Actor | Acción | Resultado observable |
| --- | --- | --- | --- |
| 1 | Productor | Selecciona productos a publicar (confirmación reforzada) | Catálogo público actualizado |
| 2 | Productor | Genera código QR | QR descargable/imprimible |
| 3 | Visitante | Accede vía URL o escanea QR | Página pública con catálogo |
| 4 | Visitante | Envía solicitud de compra (sin registro) | Formulario mínimo; solicitud registrada |
| 5 | Productor | Recibe notificación de solicitud | Alerta en Today o correo |
| 6 | Productor | Compara múltiples solicitudes | Vista comparativa con criterios explícitos |
| 7 | Agente | Explica diferencias (si se le consulta) | Explicación basada en datos; decisión humana |
| 8 | Productor | Decide y abre WhatsApp prellenado | Enlace wa.me con texto preparado |
| 9 | Productor | Envía manualmente el mensaje | Envío siempre humano |

## Métricas verificables

| Métrica | Valor esperado |
| --- | --- |
| Mutaciones internas propuestas por el agente ejecutadas sin confirmación PWA | 0 |
| Duplicados tras reintento offline | 0 |
| SQL generado por LLM ejecutado | 0 |
| Evaluación visual sin aviso de seguridad | 0 |
| Escenario sin campo de confianza | 0 |
| Envío SES sin message ID registrado | 0 |
| Enlace expirado que permite acceso | 0 |
| Agente actúa con permisos superiores al usuario | 0 |
