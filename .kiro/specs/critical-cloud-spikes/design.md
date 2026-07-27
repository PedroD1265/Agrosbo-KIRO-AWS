# Design — critical-cloud-spikes (Spec 17)

## 1. Introduccion

Este documento traduce los requisitos de `requirements.md` en un diseno tecnico
para los cuatro harnesses de spike y las microvalidaciones documentales. Define
estructura, flujos, credenciales, metricas, sanitizacion, cleanup y fallbacks.

No se implementa codigo de produccion. El codigo de spikes es desechable y vive
exclusivamente bajo `spikes/critical-cloud/`.

## 2. Estructura candidata del spike

La siguiente estructura se creara durante los checkpoints de implementacion
(no durante el kickoff documental):

```text
spikes/critical-cloud/
  README.md                      # Descripcion general, instrucciones de ejecucion
  package.json                   # Dependencias aisladas del spike (no del monorepo)
  tsconfig.json                  # Configuracion TypeScript local
  .env.example                   # Variables requeridas (sin valores reales)
  harnesses/
    s1-bedrock-tool-calling/
      index.ts                   # Harness principal
      tools.ts                   # Tool definitions para Bedrock
      fixtures/                  # Datos sinteticos (inventario, tareas)
    s2-transcribe-voice/
      index.ts                   # Harness principal (streaming obligatorio + batch fallback)
      fixtures/                  # Clips de audio sinteticos (batch: .wav/.mp3; streaming: .flac/.pcm)
      custom-vocabulary.txt      # Vocabulario agricola (si aplica)
    s3-ses-events/
      index.ts                   # Harness principal (envio + recepcion de eventos)
      eventbridge-event-parser.ts # Parsing y normalizacion de eventos SES recibidos via EventBridge/SQS
      fixtures/                  # Templates de correo sinteticos
    s4-token-secure/
      index.ts                   # Harness principal (local, sin AWS)
      token-service.ts           # Generacion, hash, validacion
      state-machine.ts           # Transiciones idempotentes
      fixtures/                  # Datos sinteticos de tareas
  results/
    manifest-s1.md               # Resultados de S1 (post-ejecucion)
    manifest-s2.md               # Resultados de S2 (post-ejecucion)
    manifest-s3.md               # Resultados de S3 (post-ejecucion)
    manifest-s4.md               # Resultados de S4 (post-ejecucion)
    microvalidation-polly.md     # M1 (documental)
    microvalidation-aurora.md    # M2 (documental)
  cleanup/
    cleanup-checklist.md         # Checklist de recursos a eliminar
    verify-cleanup.ts            # Script de verificacion post-cleanup
```

### Aislamiento del monorepo

- El root `package.json` ya declara `"spikes/*"` como workspace.
- `spikes/critical-cloud/package.json` se registra como workspace
  `@agrosbo/spike-critical-cloud`.
- Las dependencias del spike se instalan via `npm install` (ejecutado por el
  humano con autorizacion) y actualizan el `package-lock.json` raiz.
- El spike no importa de `api/src/`, `web/src/`, `shared/` ni `infra/src/`.
- El spike no modifica ningun archivo funcional del monorepo.
- El spike no modifica el `package.json` raiz.
- `npm install` siempre requiere autorizacion humana.

## 3. Flujo de credenciales temporales

### 3.1 Modelo de acceso

```text
Operador humano
  |
  v
aws login (MFA) → sesion temporal (agrosbo-login)
  |
  v
assume-role → rol de spike (permisos minimos por spike)
  |
  v
Exportar como variables de entorno para el harness
  |
  v
Harness ejecuta con credenciales en memoria
  |
  v
Credenciales expiran segun TTL del rol (~1h)
```

### 3.2 Rol de spike

- El rol `AgrosboDeveloperRole` actual tiene `ReadOnlyAccess`. No es suficiente
  para spikes.
- Se requiere un rol temporal de spike (o una politica inline temporal adjunta al
  rol existente). La decision exacta se toma durante el checkpoint de
  preflight-cloud con aprobacion humana.
- Permisos propuestos: ver REQ-IAM-02 en requirements.md (borrador sujeto a
  generacion y revision en Checkpoint 3.2).
- El rol/politica se elimina durante cleanup.

### 3.3 Variables de entorno del harness

```text
AWS_REGION=<determinada en preflight>
AWS_ACCESS_KEY_ID=<temporal>
AWS_SECRET_ACCESS_KEY=<temporal>
AWS_SESSION_TOKEN=<temporal>
BEDROCK_MODEL_ID=<determinado en preflight>
SES_SENDER_EMAIL=<sandbox verified>
SES_RECIPIENT_EMAIL=<sandbox verified>
```

Estas variables NO se commitean. Solo `.env.example` con placeholders.

## 4. S1 — Bedrock tool calling (arquitectura del harness)

### 4.1 Objetivo

Validar que Amazon Bedrock acepta tool definitions, emite `tool_use` en la
respuesta, y compone una respuesta final tras recibir `tool_result`.

### 4.2 Flujo del harness

```text
1. Definir tools:
   - get_inventory(item_name: string) → {quantity, unit, location}
   - get_pending_tasks(block_id: string) → [{id, title, status, due}]
   - create_task_draft(title, block_id, assignee) → {draft_id, preview}

2. Construir messages:
   - system: "Eres el asistente operacional de una finca agricola..."
   - user: "Cuantos kilos de fertilizante tenemos en el almacen principal?"

3. Invocar Bedrock (converse API o invoke con tool_config):
   - Medir latencia (start → first response)
   - Registrar tokens consumidos

4. Si respuesta contiene tool_use:
   - Extraer nombre + parametros
   - Ejecutar "herramienta" localmente (fixture data)
   - Construir tool_result
   - Re-invocar con tool_result

5. Verificar respuesta final:
   - Contiene dato del fixture?
   - No alucina datos no provistos?
   - Latencia total aceptable?

6. Registrar metricas en manifest
```

### 4.3 Modelo candidato

El modelo especifico NO se fija aqui. La seleccion se realiza durante el
Checkpoint 3.2 (preflight cloud) consultando informacion actual de AWS:
`aws bedrock list-foundation-models` y la documentacion vigente.

Criterios de evaluacion para seleccionar el modelo del spike:
- Disponibilidad en la region seleccionada.
- Acceso aprobado (model access puede requerir request en console).
- Soporte de tool calling (tool_use / Converse API).
- Soporte de inference profiles (si aplica).
- Costo por token (input + output).
- Latencia esperada.

No se fija ningun proveedor (Anthropic, Amazon, Meta, etc.) ni modelo
(Claude, Nova, Llama, etc.) como decision final. El spike valida la capacidad
de tool calling; el modelo definitivo para produccion se decide en Spec 21.

### 4.4 Fallbacks

- Si el modelo preferido no esta disponible: probar alternativa.
- Si tool calling no funciona con un modelo: documentar y STOP REQUIRED si
  ninguno funciona.
- Si latencia excede 30s consistentemente: FAIL documentado.

## 5. S2 — Transcribe voz agricola (arquitectura del harness)

### 5.1 Objetivo

Validar que Amazon Transcribe transcribe clips de audio en espanol con
vocabulario agricola con precision aceptable.

### 5.2 Corpus de voz sintetico

Clips sinteticos de 5-15 segundos con frases como:
- "Necesito regar el bloque 3 manana a las seis de la manana"
- "Anotar fumigacion con cobre en invernadero norte"
- "Cuantos kilos de abono quedaron en el almacen"
- "Marcar la tarea de poda como completada"
- "Revisar las colmenas del sector sur"

Generacion:
- Opcion A: Amazon Polly (si disponible) genera clips con voz es-* → los mismos
  clips validan Transcribe (nota: esto sesga positivamente; documentar).
- Opcion B: El operador graba frases manualmente.
- Opcion C: Un servicio TTS externo gratuito genera clips.

Los clips se almacenan en `harnesses/s2-transcribe-voice/fixtures/`.

### 5.3 Modos de operacion: Streaming vs Batch

Amazon Transcribe ofrece dos modos con diferentes formatos y permisos:

**Streaming (obligatorio — smoke test principal de S2)**:
- Permiso: `transcribe:StartStreamTranscription`.
- Formatos de audio admitidos: FLAC, Ogg Opus, PCM firmado 16-bit
  little-endian.
- WAV y MP3 no son formatos validos para streaming.
- Latencia esperada: primera palabra parcial < 2s.
- Dialectos candidatos: es-US, es-ES (es-MX si disponible en la region).
- No requiere UI web ni WebSocket propio de AGROSBO; se usa el SDK de
  Transcribe Streaming directamente desde Node.js.

**Batch (fallback/comparacion)**:
- Permisos: `transcribe:StartTranscriptionJob`, `transcribe:GetTranscriptionJob`.
- Formatos de audio admitidos: WAV, MP3, MP4, FLAC, OGG, AMR, WebM.
- Requiere subir audio a S3 antes de iniciar el job.
- Latencia esperada: job completo < 30s para clip de 15s.
- Dialectos candidatos: es-US, es-ES, es-MX (si disponible en la region).

El harness DEBE probar streaming como modo principal. Batch se ejecuta como
comparacion y fallback. Un resultado exclusivamente batch sin streaming se
marca APPROVED_WITH_LIMITATIONS, no PASS completo.

### 5.4 Flujo del harness (streaming — obligatorio)

```text
1. Preparar audio en formato FLAC o PCM 16-bit LE (no WAV ni MP3).
2. Abrir conexion HTTP/2 con Transcribe Streaming via SDK.
   - LanguageCode: es-US o es-ES
   - MediaEncoding: flac o pcm
   - MediaSampleRateHertz: 16000 (o segun el clip)
3. Enviar chunks de audio al stream.
4. Recibir transcripciones parciales (Transcript.Results).
5. Medir latencia: tiempo hasta primera palabra parcial.
6. Recibir transcripcion final (IsPartial=false).
7. Calcular WER contra ground truth.
8. Repetir para cada clip.
9. Registrar metricas:
   - Latencia primera palabra parcial (p50, p95)
   - Latencia transcripcion final
   - WER por clip (streaming)
```

### 5.5 Flujo del harness (batch — comparacion/fallback)

```text
1. Subir clip de audio (WAV o MP3) a bucket S3 temporal.
2. Iniciar TranscriptionJob:
   - LanguageCode: es-US o es-ES (evaluar ambos si posible; es-MX opcional)
   - MediaFormat: wav o mp3
   - Settings: CustomVocabulary (si se creo uno)
3. Poll hasta completar (o timeout 60s).
4. Descargar resultado.
5. Calcular WER contra ground truth.
6. Repetir para cada clip.
7. Registrar metricas:
   - WER por clip
   - WER promedio
   - Latencia por clip
   - Diferencia con/sin custom vocabulary (si aplica)
8. Limpiar: eliminar objetos S3, eliminar job (si persiste).
```

### 5.6 Custom vocabulary (opcional)

Si el spike tiene presupuesto, crear un custom vocabulary con terminos:
`riego`, `fumigacion`, `cosecha`, `bloque`, `invernadero`, `colmena`,
`apicultura`, `abono`, `fertilizante`, `poda`, `almacen`.

Comparar resultados con y sin el vocabulario personalizado.

### 5.7 Dialectos candidatos

Los codigos de idioma candidatos para evaluar son:
- `es-US` — espanol de Estados Unidos (ampliamente disponible).
- `es-ES` — espanol de Espana.
- `es-MX` — espanol de Mexico (opcional; evaluar si disponible en la region).

No se usa `es-419` como codigo de Transcribe. Si un dialecto no esta disponible
en la region seleccionada, documentar y probar alternativas.

### 5.8 Fallbacks

- Si es-US no esta disponible en la region: probar es-ES.
- Si WER > 50%: FAIL documentado; evaluar si custom vocabulary mejora.
- Si Transcribe no esta disponible en la region seleccionada: probar region
  alternativa.

## 6. S3 — SES eventos verificables (arquitectura del harness)

### 6.1 Objetivo

Validar el flujo completo: enviar correo via SES → recibir eventos via
EventBridge → SQS → deduplicar → registrar estado.

### 6.2 Flujo del harness

```text
1. Verificar identidad verificada:
   - Confirmar que la direccion de envio esta verificada en SES sandbox.
   - Si no, STOP REQUIRED (el humano debe verificar en la consola).

2. Crear infraestructura temporal (ejecutada por el humano):
   a. Crear SQS queue (agrosbo-spike-ses-events-{timestamp}).
   b. Crear SES Configuration Set (agrosbo-spike-config-{timestamp}).
   c. Crear EventBridge rule que capture eventos SES del configuration set.
      - Patron: source = "aws.ses", detail-type = "Email Sending Events"
   d. Crear EventBridge target: SQS queue.
   e. Configurar SQS queue policy para permitir EventBridge -> SQS.

3. Enviar correo via SES (ejecutado por el humano):
   - From: operador@verificado.sandbox
   - To: operador@verificado.sandbox (sandbox) o Mailbox Simulator address
   - Subject: "[SPIKE] Test #{uuid}"
   - Body: contenido sintetico
   - ConfigurationSetName: el configuration set creado
   - Tags opcionales: [{Name: "spike", Value: "s3"}, {Name: "run-id", Value: uuid}]
   - Registrar MessageId retornado

4. Poll SQS queue (agente analiza output sanitizado):
   - Timeout: 5 min
   - Esperar mensaje con eventType Delivery (o Bounce si Mailbox Simulator)
   - Extraer mail.messageId del evento
   - Verificar correlacion: messageId del evento == MessageId de SendEmail

5. Tolerancia a eventos:
   - Procesar eventos en cualquier orden de llegada
   - No asumir que Delivery llega antes que opened_link
   - No retroceder estado principal por evento tardio

6. Simular deduplicacion:
   - Reenviar el mismo mensaje al procesador (en memoria)
   - Verificar que no duplica estado

7. Simular Bounce:
   - Enviar a bounce@simulator.amazonses.com (SES Mailbox Simulator)
   - Verificar que evento Bounce llega y se procesa correctamente
   - Verificar que estado refleja el bounce

8. Registrar metricas:
   - Latencia envio -> evento Delivery
   - Latencia envio -> evento Bounce (Mailbox Simulator)
   - Correlacion por MessageId: PASS/FAIL
   - Deduplicacion: PASS/FAIL
   - Tolerancia a orden: PASS/FAIL

9. Cleanup (ejecutado por el humano):
   - Eliminar EventBridge targets
   - Eliminar EventBridge rule
   - Eliminar SQS queue
   - Eliminar SES Configuration Set
   - Verificar eliminacion
```

### 6.3 Limitaciones de sandbox

En modo sandbox:
- Solo se puede enviar a direcciones verificadas.
- Bounces "reales" a externos no son posibles.
- Se puede usar el SES Mailbox Simulator para generar bounces/complaints.

El harness debe documentar claramente que opera en sandbox y que comportamiento
se extrapola vs. se verifica directamente.

### 6.4 Deduplicacion

El harness implementa un store en memoria (Map) que registra event IDs
procesados. Si un evento llega duplicado (mismo event ID o messageId+eventType),
no actualiza estado.

### 6.5 Validacion de eventos

Los eventos llegan como mensajes SQS con cuerpo JSON proveniente de EventBridge.
Se valida que el source es "aws.ses" y que el detail contiene los campos
esperados (eventType, mail.messageId). No se requiere validacion de firma SNS
dado que se usa EventBridge → SQS directamente.

### 6.6 Fallbacks

- Si SES no esta disponible en la region: usar region alternativa.
- Si SES Mailbox Simulator no genera Bounce: documentar y marcar como PARTIAL.
- Si EventBridge events no llegan en 5 min: reintentar una vez; si falla → FAIL.
- Si configuration set no puede crearse (permissions): STOP REQUIRED.

## 7. S4 — Token externo seguro (arquitectura del harness)

### 7.1 Objetivo

Validar el flujo completo de token opaco: generacion, hash, validacion,
expiracion, revocacion y transicion idempotente de estados. Ejecucion 100% local.

### 7.2 Flujo del harness

```text
PARTE A — Pruebas crypto locales (sin DB)

1. Generar token:
   - crypto.randomBytes(32) → base64url
   - Registrar entropia efectiva (256 bits)

2. Hash y persistencia (en memoria para esta parte):
   - SHA-256(token) → hash hex
   - Almacenar: {hash, taskId, state: 'sent', createdAt, expiresAt, revoked: false}

3. Validar token:
   - Input: raw token
   - Computar SHA-256
   - Buscar en store por hash
   - Verificar: no expirado, no revocado, estado permite accion

4. Transiciones de estado:
   - sent → opened_link (al validar token por primera vez)
   - opened_link → responded (al recibir respuesta)
   - responded → completed (al completar tarea)
   - Verificar: transicion ilegal (ej. completed → sent) es rechazada
   - Verificar: transicion repetida es idempotente (no duplica efecto)

5. Expiracion:
   - Crear token con TTL de 1 segundo
   - Esperar 2 segundos
   - Verificar rechazo

6. Revocacion:
   - Crear token valido
   - Revocar
   - Verificar rechazo

7. Idempotencia:
   - Ejecutar misma accion dos veces con mismo token
   - Verificar que estado no avanza dos veces
   - Verificar que respuesta es identica

PARTE B — Prueba PostgreSQL aislada de concurrencia

8. Usar la instancia local de PostgreSQL (agrosbo-local-db, puerto 54321).
9. Crear tabla temporal de spike (no modificar schemas productivos):
   - CREATE TABLE spike_collab_tokens (hash TEXT PK, task_id TEXT, state TEXT,
     created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, revoked BOOLEAN)
10. Concurrencia:
    - 10 solicitudes concurrentes con el mismo token intentando la misma
      transicion (opened_link → responded).
    - Exactamente UNA debe transicionar; las demas reciben conflicto o
      resultado idempotente.
    - Verificar que la tabla tiene un solo registro con state='responded'.
11. Replay identico:
    - Repetir la misma accion ya aplicada.
    - Verificar respuesta idempotente (no error, no duplicacion).
12. Respuesta contradictoria:
    - Una solicitud intenta "responded" y otra intenta "revoked" al mismo
      tiempo.
    - Una gana; la otra recibe conflicto.
13. Cleanup: DROP TABLE spike_collab_tokens.

PARTE C — Metricas

14. Rate limiting (simulado):
    - Documentar el patron de rate limiting (no implementar middleware HTTP
      completo en el spike)

15. Registrar metricas:
    - Tiempo de generacion + hash
    - Throughput crypto (operaciones/segundo)
    - Latencia de transicion concurrente en PostgreSQL
    - Todos los criterios PASS/FAIL
```

### 7.3 Dependencias

- Node.js built-in `crypto` module (parte A).
- PostgreSQL local (`agrosbo-local-db` en puerto 54321) + driver `pg` (parte B).
- No se modifican schemas ni migraciones productivas.
- La tabla `spike_collab_tokens` es temporal y se elimina al finalizar.

### 7.4 Relacion con ADR 017

Este spike valida las decisiones de ADR 017:
- Token opaco (no JWT stateless).
- Solo hash persistido.
- SHA-256 como algoritmo recomendado.
- TTL + revocacion.
- Datos minimos expuestos.
- Transiciones no lineales (eventos pueden llegar fuera de orden).

## 8. Microvalidaciones documentales

### M1 — Amazon Polly

Documento investigativo (sin ejecucion de codigo obligatoria):
- Voces disponibles en es-* (es-US, es-ES, es-MX).
- Tipo: Standard vs Neural vs Generative.
- Formato de audio soportado: mp3, ogg_vorbis, pcm.
- Latencia esperada (documentacion oficial).
- Costo por caracter.
- Disponibilidad regional.
- Compatibilidad con streaming.
- Conclusion: viable/no viable para P0; restricciones conocidas.

### M2 — Aurora PostgreSQL + Data API

Documento investigativo:
- Versiones de engine PostgreSQL soportadas en Aurora Serverless v2.
- Regiones donde Data API esta disponible.
- Region `sa-east-1`: soporta Aurora SV2 + Data API? Si no, alternativas.
- Limites de Data API (tamano de respuesta, timeout, tipos soportados).
- Latencia esperada (cold start vs warm).
- Compatibilidad con Drizzle ORM (modo Data API existente en el codigo).
- Conclusion: restricciones conocidas y decisiones diferidas para Spec 18.

## 9. Metricas y manifest de resultados

### 9.1 Formato del manifest

Cada spike produce un archivo `results/manifest-sN.md`:

```markdown
# Spike SN Results — [nombre]

## Metadata
- Date: YYYY-MM-DD
- Region: [region]
- Service version: [version/model ID]
- Operator: [redacted]
- Budget approved: USD X.XX
- Budget consumed: USD X.XX

## Metrics
| Metric | Value |
|--------|-------|
| Latency p50 | X ms |
| Latency p95 | X ms |
| ... | ... |

## Criteria Results
| Criterion | Result | Evidence |
|-----------|--------|----------|
| ... | PASS/FAIL | [referencia a log sanitizado] |

## Sanitized Logs
[extractos relevantes sin credenciales ni account IDs]

## Decisions for Next Spec
- [observaciones para Spec 18/21/23/24]

## Cleanup Confirmation
- [lista de recursos eliminados con verificacion]
```

### 9.2 Sanitizacion

Antes de commitear cualquier output:
- Reemplazar account IDs con `<ACCOUNT_ID>`.
- Reemplazar ARNs con `arn:aws:service:<REGION>:<ACCOUNT_ID>:resource/<REDACTED>`.
- Reemplazar emails con `operator@example.com` o `recipient@example.com`.
- Reemplazar session tokens completamente.
- Reemplazar nombres de bucket con `<SPIKE_BUCKET>`.
- Conservar: model IDs, region names, error codes, latencias, metricas.

## 10. Cleanup antes de provisionar

### 10.1 Principio

Antes de crear recursos para un spike, verificar que no existen recursos
residuales de ejecuciones previas. Esto evita costos ocultos y conflictos de
nombres.

### 10.2 Checklist pre-provisionamiento

```text
[ ] No existen buckets S3 con prefijo agrosbo-spike-*
[ ] No existen SQS queues con prefijo agrosbo-spike-*
[ ] No existen EventBridge rules con prefijo agrosbo-spike-*
[ ] No existen SES configuration sets con prefijo agrosbo-spike-*
[ ] No existen Transcribe jobs con prefijo agrosbo-spike-*
[ ] No existen IAM policies con prefijo agrosbo-spike-*
[ ] Budget alerts estan activas (confirmacion humana)
```

### 10.3 Nomenclatura de recursos

Todos los recursos creados durante spikes usan el prefijo `agrosbo-spike-` para
facilitar identificacion y cleanup. Ejemplo:
- `agrosbo-spike-audio-{timestamp}`
- `agrosbo-spike-ses-events-{timestamp}`

## 11. Fallbacks generales

| Condicion | Fallback |
|-----------|----------|
| Servicio no disponible en region provisional | Probar region alternativa documentada en preflight |
| Modelo Bedrock no accesible (requiere approval) | STOP REQUIRED; solicitar approval manual |
| Presupuesto excedido | Abortar spike; reportar costo parcial |
| Timeout de API | Reintentar una vez; si falla → FAIL |
| Rate limiting de AWS | Backoff exponencial (max 3 reintentos) |
| Credenciales expiran durante ejecucion | Re-autenticar y continuar (manual) |

## 12. Riesgos y decisiones diferidas

### 12.1 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|-----------|
| Bedrock model access no aprobado | Media | Bloquea S1 | Solicitar con anticipacion; evaluar modelos alternativos |
| Region sa-east-1 no soporta Bedrock | Alta | Requiere region alternativa | Preflight cloud verifica; alternativa documentada |
| SES sandbox limita validacion de bounces | Alta | S3 parcial | Usar Mailbox Simulator; documentar limitaciones |
| Transcribe WER inaceptable | Baja | Afecta confianza en Spec 23 | Custom vocabulary; evaluar multiples dialectos |
| Costos inesperados por Bedrock | Baja | Presupuesto | Budget cap; modelo economico primero |
| Streaming Transcribe complejo para spike | Media | Reduce cobertura | Documentar como DEFERRED; batch es suficiente para spike |

### 12.2 Decisiones diferidas

Las siguientes decisiones NO se toman en esta Spec:

| Decision | Se toma en | Criterio |
|----------|-----------|----------|
| Modelo Bedrock definitivo para produccion | Spec 21 | Calidad + costo + latencia verificados |
| Region de produccion | Spec 18 | Disponibilidad de todos los servicios P0 |
| Motor de STT definitivo (Transcribe vs alternativa) | Spec 23 | WER + latencia + costo en uso real |
| Esquema de tablas para tokens | Spec 24 | Resultado del spike S4 informa pero no define |
| Arquitectura de recepcion de eventos SES en produccion | Spec 24 | SNS vs HTTP endpoint vs EventBridge |
| CloudFront /api/* topology | Spec 18/19 | No es materia de spikes |
| Custom vocabulary permanente para Transcribe | Spec 23 | Resultados del spike informan |

## 13. Trazabilidad Design → Requirements

| Seccion | Requirements cubiertos |
|---------|----------------------|
| §2 Estructura | REQ-EVD-01, REQ-EVD-03, REQ-EVD-04, REQ-DIS-03, REQ-CLN-05 |
| §3 Credenciales | REQ-SEC-01, REQ-SEC-02, REQ-SEC-06, REQ-IAM-01–04 |
| §4 S1 Bedrock | Criterios S1 (§9 de requirements) |
| §5 S2 Transcribe | Criterios S2 (§9 de requirements), REQ-MET-01 |
| §6 S3 SES | Criterios S3 (§9 de requirements), REQ-SEC-07 |
| §7 S4 Token | Criterios S4 (§9 de requirements), REQ-SEC-04 |
| §8 Microvalidaciones | M1 y M2 de §2 de requirements |
| §9 Metricas | REQ-MET-01, REQ-MET-02, REQ-EVD-01, REQ-EVD-02 |
| §10 Cleanup | REQ-CLN-01–05 |
| §11 Fallbacks | REQ-STP-01 (condiciones de parada), REQ-REG-03 |
| §12 Riesgos | REQ-NEG-01–07, REQ-DIS-01–04 |
