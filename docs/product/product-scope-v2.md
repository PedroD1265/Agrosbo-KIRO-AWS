# AGROSBO Product Scope v2

## 1. Propósito y autoridad

Este documento es la **fuente canónica y autoritativa** del alcance del producto
AGROSBO. Define qué se construye, en qué orden, con qué límites y bajo qué
principios.

### Relación con otros documentos

- **ADRs**: registran decisiones arquitectónicas puntuales; este documento las
  integra en un marco coherente.
- **Arquitectura** (`docs/architecture/`): detalla el cómo técnico; este
  documento fija el qué y el por qué.
- **Steering** (`.kiro/steering/`): contiene reglas operativas para el agente de
  desarrollo; no duplica ni reemplaza este contrato.
- **Specs** (`.kiro/specs/`): formalizan requirements, design y tasks de una
  unidad de trabajo; derivan de este documento.
- **README**: resume y enlaza; no es fuente de verdad del alcance.

Cuando exista contradicción entre cualquier documento derivado y este archivo,
prevalece `product-scope-v2.md` hasta que una decisión posterior sea registrada
en un ADR y reflejada aquí.

El estado real de una capacidad debe verificarse mediante código, rutas,
persistencia, pruebas y despliegue; no solo por afirmaciones documentales.

## 2. Definición del producto

AGROSBO es una **plataforma web agrícola operacional** que:

- Funciona como **PWA offline-first** para la gestión integral de una finca.
- Centraliza información, coordina trabajo de campo y convierte registros
  dispersos en acciones, historial y evidencia operativa.
- Integra un **agente operacional multimodal** (nombre visible: **Asistente
  AGROSBO**; nombre técnico: _operational farm agent_) como interfaz central de
  interacción.
- Produce acciones **visibles, auditables y confirmadas** por el usuario.
- Opera sin conexión para la captura agrícola normal y requiere conectividad para
  capacidades de IA, voz y comunicaciones externas.

### Lo que AGROSBO NO es

- No es un chatbot genérico ni un asistente conversacional de propósito general.
- No es un sistema de diagnóstico agronómico definitivo.
- No es un marketplace en P0 ni en P1.
- No es una plataforma de pagos.
- No es un ERP terminado ni una certificadora.
- No es un sistema oficial gubernamental.
- No es multi-tenant completo en P0/P1.

## 3. Estado actual verificado

Resumen honesto de lo que existe en código a la fecha de este documento. La
matriz detallada con evidencia por capacidad se mantendrá en
`docs/product/capability-status-matrix.md` (documento planificado).

### Implementado y funcional

- Módulos agrícolas: bloques, invernaderos, campañas, tareas, observaciones,
  aplicaciones fitosanitarias, inventario con movimientos, riego (+ asesor
  heurístico), cosecha, gastos y mano de obra, apicultura, adjuntos, clima
  (Open-Meteo), alertas derivadas, reportes CSV, catálogo de cultivos.
- CRUD completo con validación Zod en todos los dominios.
- PostgreSQL vía Drizzle como fuente de verdad persistente.
- MemStorage parcial para desarrollo rápido (cubre solo core de IStorage: blocks,
  greenhouses, campaigns, irrigation, tasks, observations, inventory, harvest,
  settings, alerts).
- PWA instalable con service worker (network-first nav, SWR assets, network-only
  API).
- Cola offline en IndexedDB (Dexie) con 40+ tipos de mutación, backoff
  exponencial, reconciliación de IDs temporales.
- Idempotencia HTTP atómica (tabla PostgreSQL + fallback memoria).
- RBAC con 5 roles (admin, técnico, encargado, operario, finanzas).
- Autenticación por cookie firmada HMAC con revocación persistente.
- Health checks (/health/live, /health/ready).
- Provider pattern implementado: IdentityProvider, AttachmentStorage,
  DocumentExtractionProvider (solo variantes locales funcionales).
- Lambda adapter existente (`@vendia/serverless-express`), fail-closed init.
- Mapa espacial SVG/GeoJSON (visualización con datos de bloques/invernaderos).
- 22 páginas frontend cubriendo todos los dominios.

### Parcial o placeholder

- Providers cloud (Cognito JWT, S3 attachments, Textract, Azure DI): interfaces
  definidas, implementaciones arrojan error "not implemented".
- CDK infraestructura: `infra/src/index.ts` es `export {}` (placeholder vacío).
- Endpoints espaciales: 5 rutas referenciadas por el frontend no existen en el
  backend (gap documentado, fuera de Fase 0).
- Adjuntos: solo disco local funcional; S3 con URLs prefirmadas no implementado.

### Ausente

- Agente operacional (ninguna línea de código).
- Voz (STT/TTS): ningún componente.
- Amazon SES: ningún código.
- Colaboradores externos: ningún modelo ni UI.
- Tienda pública: ningún concepto implementado.
- Análisis visual agrícola: ningún procesamiento de imágenes.
- Motor IrrigationDelayScenario: no existe (IrrigationAdvisor actual es una
  heurística simple, no calcula escenarios multi-caso).
- Despliegue AWS: ningún recurso creado.

### Baseline de pruebas

- 132 pruebas unitarias.
- 7 pruebas MemStorage HTTP.
- 26 pruebas de integración PostgreSQL.
- **Total: 165 pruebas aprobadas.**
- Quality gates: format, encoding, lint (0 errores), typecheck y build verdes.

## 4. Principios no negociables

1. **Offline-first** para la operación agrícola normal.
2. **Cloud-connected** para IA, voz y comunicaciones externas.
3. **Herramienta antes que texto generativo**: el agente ejecuta acciones
   estructuradas, no genera prosa abierta como función principal.
4. **Acciones visibles y auditables**: toda mutación queda registrada con autor,
   timestamp y contexto.
5. **Mínimo privilegio**: cada actor accede solo a lo que necesita.
6. **Confirmación explícita**: ninguna mutación se ejecuta sin aprobación del
   usuario.
7. **No SQL libre**: el agente no genera ni ejecuta SQL; solo invoca
   herramientas parametrizadas.
8. **No acceso irrestricto a base de datos**: toda consulta pasa por
   herramientas con RBAC.
9. **Idempotencia**: toda operación es reintentable sin duplicar efectos.
10. **Degradación funcional honesta**: si un servicio no está disponible, se
    informa al usuario en vez de simular funcionalidad.
11. **Cálculos deterministas**: los motores de escenarios producen resultados
    reproducibles; el LLM explica pero no calcula.
12. **Evaluación visual preliminar**: nunca diagnóstico definitivo.
13. **Datos mínimos necesarios**: los colaboradores externos ven solo lo
    indispensable para su tarea.
14. **Alcance de hackathon controlado**: P0 terminable antes que P2 inflado.

## 5. Contrato operativo del agente

El Asistente AGROSBO (operational farm agent) opera bajo estas reglas:

### Capacidades

- Consulta datos reales mediante herramientas estructuradas.
- Lee y navega sin requerir confirmación.
- Navega visiblemente dentro de la UI (el usuario ve dónde está el agente).
- Prepara formularios o borradores visibles antes de mutar.
- Solicita datos faltantes al usuario.
- Requiere confirmación explícita antes de ejecutar cualquier mutación.
- Requiere confirmación reforzada para acciones sensibles.
- Ejecuta mutaciones de forma determinista e idempotente (vía cola offline).
- Registra toda acción para auditoría.
- Responde visualmente (texto, UI) y opcionalmente por voz.
- Presenta transcripciones editables.
- Aclara ambigüedades en nombres, fechas, lugares y cantidades.

### Uso de herramientas y generación

- Toda afirmación sobre el estado real de la finca debe estar basada en
  herramientas y datos consultados.
- Explicaciones generales, ayuda de interfaz y aclaraciones pueden generarse sin
  herramientas cuando no afirmen hechos operativos.
- El agente debe indicar cuando no consultó información real de la finca.
- No debe inventar registros, mediciones, costos, fechas ni estados.

### Acciones sensibles (confirmación reforzada)

- Gastos y costos.
- Cambios de inventario.
- Eliminaciones.
- Publicaciones públicas (P1).
- Comunicaciones externas (SES, enlaces).
- Aceptación o rechazo de interesados (P1).
- Cualquier acción con efecto contractual o financiero.

### Prohibiciones del agente

- No autoriza permisos ni modifica roles.
- No aprueba gastos por sí solo.
- No acepta compradores ni celebra acuerdos.
- No ejecuta SQL generado.
- No se salta la confirmación del usuario.
- No se presenta como agrónomo ni emite diagnósticos definitivos.
- No muta directamente desde el servidor sin confirmación en la PWA.

## 6. P0 — Alcance obligatorio

Todas las capacidades listadas a continuación son obligatorias para la entrega
del hackathon. El conjunto integrado P0 está PLANNED; sin embargo, varios
componentes base ya están IMPLEMENTED o PARTIAL (CRUD de tareas, usuarios/RBAC,
cola offline, idempotencia, observaciones, adjuntos locales, providers boundary,
Lambda adapter). El estado exacto de cada capacidad se mantendrá en
`docs/product/capability-status-matrix.md` (documento planificado).

### 6.1 Despliegue del core en AWS

- **Objetivo**: infraestructura reproducible con CDK; core agrícola funcional en
  la nube.
- **Resultado observable**: app accesible vía URL pública; datos en Aurora;
  adjuntos en S3.
- **Límite**: single-organization; sin dominio propio obligatorio.

### 6.2 Agente operacional con herramientas controladas

- **Objetivo**: el usuario interactúa con el Asistente AGROSBO para consultar
  datos y preparar acciones.
- **Resultado observable**: endpoint REST funcional; herramientas de lectura y
  escritura definidas; respuestas basadas en datos reales.
- **Límite**: no SQL libre; no acciones autónomas; RBAC obligatorio.

### 6.3 Consultas por texto

- **Objetivo**: el usuario escribe preguntas o instrucciones y el agente responde
  con datos estructurados.
- **Resultado observable**: interfaz de chat integrada en la app; respuestas
  basadas en herramientas.
- **Límite**: toda afirmación sobre la finca requiere consulta a herramientas;
  explicaciones generales y ayuda de interfaz no requieren herramientas.

### 6.4 Entrada por voz

- **Objetivo**: captura de instrucciones por voz usando Amazon Transcribe.
- **Resultado observable**: botón push-to-talk; transcripción visible y editable;
  streaming preferido, clip corto como fallback.
- **Límite**: requiere conectividad; no voz offline en P0.

### 6.5 Respuestas visuales y habladas

- **Objetivo**: el agente responde con texto visible y opcionalmente por voz
  usando Amazon Polly.
- **Resultado observable**: texto siempre disponible; audio reproducible.
- **Límite**: TTS requiere conectividad.

### 6.6 Navegación visible

- **Objetivo**: el agente puede dirigir la UI hacia una página o entidad
  relevante.
- **Resultado observable**: la app navega y el usuario ve el contexto.
- **Límite**: no manipulación invisible del estado.

### 6.7 Creación y modificación de tareas

- **Objetivo**: el agente prepara borradores de tareas nuevas o modificaciones a
  existentes.
- **Resultado observable**: borrador visible en UI; confirmación del usuario;
  mutación idempotente vía cola offline.
- **Límite**: no se crea ni modifica sin confirmación explícita.

### 6.8 Borradores y confirmación

- **Objetivo**: toda acción mutadora pasa por un estado de borrador visible antes
  de ejecutarse.
- **Resultado observable**: UI muestra el borrador; usuario confirma o descarta.
- **Límite**: el servidor no puede ejecutar sin la confirmación de la PWA.

### 6.9 Colaboradores internos

- **Objetivo**: usuarios con cuenta y rol asignado dentro de la organización.
- **Resultado observable**: CRUD de usuarios con roles; asignación a tareas;
  historial.
- **Límite**: single-organization en P0.

### 6.10 Colaboradores externos sin cuenta completa

- **Objetivo**: personas externas que reciben un enlace seguro para responder a
  una tarea específica sin crear cuenta.
- **Resultado observable**: enlace generado; acceso limitado; respuesta
  registrada.
- **Límite**: token opaco, hash persistido, expiración por TTL, revocable,
  scoped a una tarea, rate-limited, datos mínimos expuestos.

### 6.11 Amazon SES

- **Objetivo**: envío de correos de notificación y enlaces seguros a
  colaboradores.
- **Resultado observable**: envío aceptado por SES con identificador de mensaje;
  evento de entrega verificable cuando SES lo reporte.
- **Límite**: SES puede comenzar en sandbox (destinatarios restringidos); para
  enviar a colaboradores externos reales se requiere acceso de producción y una
  identidad verificada. El resultado observable de P0 debe distinguir "envío
  aceptado" de "evento de entrega".

### 6.12 Enlaces seguros y limitados

- **Objetivo**: URLs temporales que dan acceso a una tarea específica sin
  autenticación completa.
- **Resultado observable**: enlace funcional con token; vista pública mínima.
- **Límite**: token opaco aleatorio; solo hash en DB; sin JWT stateless como
  mecanismo principal; expiración por TTL; revocación manual posible;
  invalidación al alcanzar un estado terminal (completed) cuando corresponda;
  una simple apertura no invalida automáticamente el enlace; el token permanece
  limitado a una tarea.

### 6.13 Aceptar, rechazar o solicitar aclaración

- **Objetivo**: el colaborador externo puede responder al enlace con una acción
  estructurada.
- **Resultado observable**: respuesta registrada; estado actualizado; productor
  notificado.
- **Límite**: solo tres acciones posibles; sin chat abierto.

### 6.14 Seguimiento de eventos de colaboración

- **Objetivo**: registrar el ciclo de vida de cada colaboración con estados
  honestos.
- **Resultado observable**: historial de estados por colaboración consultable.
- **Límite**: estados mínimos definidos en la sección 10; semántica honesta sin
  inferir lectura del correo.

### 6.15 Evaluación visual preliminar de fotografías

- **Objetivo**: el usuario sube una foto agrícola y el agente produce una
  evaluación preliminar vía Bedrock multimodal.
- **Resultado observable**: síntomas visibles, causas posibles, información
  faltante, inspecciones recomendadas, urgencia, confianza, aviso de seguridad.
- **Límite**: evaluación preliminar, no diagnóstico; no modelo custom P0; no
  Rekognition como motor principal; no recomendación automática de pesticidas.

### 6.16 Creación de observación o tarea desde la evaluación

- **Objetivo**: tras la evaluación visual, el agente puede preparar un borrador
  de observación o tarea.
- **Resultado observable**: borrador prepopulado con datos de la evaluación;
  confirmación del usuario.
- **Límite**: sigue el flujo de confirmación estándar.

### 6.17 IrrigationDelayScenario

- **Objetivo**: motor determinista que calcula escenarios de retraso de riego.
- **Resultado observable**: produce baseline, mejor caso, caso esperado, peor
  caso, rango, supuestos, datos utilizados, información faltante, confianza.
- **Límite**: módulo separado del irrigation advisor actual (puede reutilizar
  sus datos); el LLM explica y resume pero no calcula.

### 6.18 Golden path reproducible

- **Objetivo**: flujo completo demostrable de extremo a extremo con datos
  sintéticos estables.
- **Resultado observable**: demo ejecutable sin pasos manuales ambiguos.
- **Límite**: datos sintéticos, no reales; ambiente controlado.

### 6.19 Seguridad, observabilidad y límites de costo

- **Objetivo**: despliegue seguro con monitoreo básico y presupuesto controlado.
- **Resultado observable**: Secrets Manager para secretos; CloudWatch para logs;
  alarma de costo básica; auth por Cognito JWT en producción.
- **Límite**: observabilidad mínima viable, no APM completo.

### 6.20 Documentación y trazabilidad del uso de Kiro

- **Objetivo**: evidencia del proceso de ingeniería con Kiro.
- **Resultado observable**: Steering, Specs, ADRs, Hooks, checkpoints
  documentados y trazables.
- **Límite**: solo usos reales; no estadísticas inventadas.

## 7. P1 — Alcance posterior obligatorio

P1 se implementa después de que P0 esté estable. Sigue siendo
**single-organization**. Estado actual: PLANNED P1 (nada implementado).

### 7.1 Tienda pública de una sola finca

- Página pública con productos que el productor decide publicar.
- URL dedicada por finca.
- Código QR generado para acceso físico.
- Catálogo de productos publicables (selección del inventario/cosecha).
- Separación explícita entre inventario interno y oferta pública.

### 7.2 Solicitudes de compra sin registro

- Visitante puede enviar una solicitud de compra sin crear cuenta.
- Formulario público mínimo.
- Notificación al productor.

### 7.3 Comparación explicada de interesados

- El productor ve múltiples solicitudes y las compara con criterios explícitos.
- El agente puede explicar la comparación, pero la decisión final es humana.
- No aceptación automática.

### 7.4 WhatsApp mediante wa.me prellenado

- Enlace wa.me con texto prellenado que el productor abre manualmente.
- Envío siempre humano; la app prepara pero no envía.
- Sin WhatsApp Cloud API en P1.

### 7.5 Notas de voz capturadas offline

- Captura de audio en el dispositivo sin conexión.
- Almacenamiento local (IndexedDB o File API).
- Procesamiento (transcripción) al recuperar conexión.

### 7.6 Resumen hablado del día

- Síntesis de los datos de Today en audio vía Polly.
- Reproducción bajo demanda.
- Texto siempre disponible como alternativa.

## 8. P2 — Fuera del alcance obligatorio

Las siguientes capacidades están explícitamente fuera del alcance de P0 y P1. Se
documentan para evitar scope creep y pueden planificarse arquitectónicamente sin
retrasar la entrega.

- Marketplace entre múltiples organizaciones.
- Pagos integrados.
- Reputación y calificaciones.
- Logística y trazabilidad de envíos.
- Mensajería en tiempo real (WebSocket).
- WhatsApp Cloud API en producción.
- Multi-tenancy completo (aislamiento entre organizaciones).
- Resolución compleja de conflictos entre dispositivos.
- Diagnóstico agronómico especializado.
- Recomendaciones automatizadas de agroquímicos.
- Automatización financiera.
- Automatización contractual.
- Aceptación automática de compradores.
- Órdenes comerciales autónomas.

P2 no retrasará P0 ni P1. Puede documentarse como visión futura en los
documentos de arquitectura correspondientes.

## 9. Personas resumidas

Resumen de roles. La matriz completa con permisos detallados se mantendrá en
`docs/product/personas-and-permissions.md` (documento planificado).

| Persona | Descripción | Alcance |
| --- | --- | --- |
| Propietario / administrador | Dueño de la finca; acceso total; decide acciones financieras y de personal | P0 |
| Gerente / encargado | Planifica campañas; supervisa operaciones; aprueba gastos | P0 |
| Agrónomo / técnico | Registra aplicaciones, observaciones, inspecciones; configura riego | P0 |
| Trabajador / operario | Ejecuta tareas; registra datos en campo, frecuentemente offline | P0 |
| Visualizador / finanzas | Consulta reportes y costos; registra gastos | P0 |
| Colaborador externo | Sin cuenta; acceso limitado a una tarea vía enlace seguro | P0 |
| Visitante / comprador | Accede a la tienda pública; envía solicitud de compra sin registro | P1 |

## 10. Colaboradores y notificaciones

### Colaborador interno

- Cuenta con usuario y contraseña (o Cognito en producción).
- Rol asignado (admin, técnico, encargado, operario, finanzas).
- Perfil con nombre, contacto, habilidades, disponibilidad, tarifa opcional.
- Historial de tareas y actividades.

### Colaborador externo

- Sin cuenta completa.
- Acceso limitado a una tarea específica.
- Token opaco aleatorio generado por el servidor.
- Solo el hash del token se persiste en PostgreSQL.
- Expiración configurable por TTL.
- Revocación manual posible.
- Invalidación al alcanzar un estado terminal (completed) cuando corresponda.
- Una simple apertura del enlace no lo invalida automáticamente.
- Rate limiting en el endpoint público.
- Datos mínimos expuestos (solo lo necesario para la tarea).
- Puede: aceptar, rechazar o solicitar aclaración.

### Estados de notificación

| Estado | Significado |
| --- | --- |
| sent | SES aceptó la solicitud de envío y el sistema almacenó el identificador del mensaje. No significa entrega. |
| delivered | Se recibió un evento de entrega de SES indicando aceptación por el servidor de correo del destinatario. No garantiza lectura, bandeja principal ni interacción humana. |
| opened_link | El endpoint protegido recibió una solicitud válida usando el enlace. Puede corresponder al destinatario o a un escáner automático de seguridad. No demuestra que el correo fue leído ni que una persona abrió el enlace. |
| responded | Se recibió una respuesta estructurada válida (aceptar, rechazar o solicitar aclaración). |
| completed | La tarea o colaboración alcanzó su estado final definido. |

Aclaraciones:

- No se usa "read" como estado.
- No se usa píxel de apertura como evidencia principal de lectura.
- La tabla de eventos de notificación se modela separada de la tabla principal de
  colaboraciones.

## 11. Voz y conectividad

### Arquitectura de voz

- **STT**: Amazon Transcribe (motor principal).
- **TTS**: Amazon Polly (motor principal).
- **Interacción inicial**: push-to-talk.
- **Preferencia de transporte**: streaming.
- **Fallback de captura**: clip de audio corto.
- **Web Speech API**: fallback opcional del navegador, no arquitectura principal.

### Reglas de voz

- Texto siempre visible junto al audio.
- Transcripción editable antes de enviar al agente.
- Confirmación explícita de nombres, fechas, lugares y cantidades ambiguas.
- IA en tiempo real requiere conexión.
- Tareas agrícolas normales siguen funcionando offline sin voz.
- Notas de voz capturadas offline para procesamiento posterior son P1.

### Modelo de conectividad

- Voz en tiempo real: requiere conexión activa.
- Si no hay conexión: la interfaz de voz se deshabilita; el texto sigue
  disponible; la captura de datos offline funciona normalmente.

## 12. Evaluación visual agrícola

### Resultado mínimo de una evaluación

- Síntomas visibles detectados.
- Causas posibles.
- Información faltante que el usuario podría proveer.
- Inspecciones recomendadas.
- Urgencia estimada.
- Nivel de confianza.
- Aviso de seguridad (aclaración de que es evaluación preliminar).
- Opción de preparar una observación o tarea a partir del resultado.

### Tecnología

- Amazon Bedrock con modelo multimodal.
- Evaluación preliminar; nunca diagnóstico definitivo.
- No se entrena modelo custom en P0.
- Amazon Rekognition no es el motor principal.
- No se emite recomendación automática de pesticidas ni agroquímicos.

### Flujo

1. Usuario sube foto desde la app.
2. Foto se envía a Bedrock multimodal.
3. Resultado se presenta con estructura definida.
4. Usuario puede crear observación o tarea (borrador + confirmación).

## 13. IrrigationDelayScenario

Módulo determinista separado del irrigation advisor actual. Puede reutilizar
datos y reglas del advisor existente, pero produce un resultado estructurado
multi-caso.

### Salida obligatoria

| Campo | Descripción |
| --- | --- |
| baseline | Estado actual sin intervención |
| bestCase | Mejor escenario posible |
| expectedCase | Escenario más probable |
| worstCase | Peor escenario razonable |
| range | Rango numérico del impacto |
| assumptions | Supuestos utilizados para el cálculo |
| dataUsed | Datos reales consumidos |
| missingData | Información que mejoraría la precisión |
| confidence | Nivel de confianza del cálculo (high/medium/low) |

### Rol del LLM

- Explica los resultados al usuario en lenguaje natural.
- Resume la incertidumbre.
- Presenta los supuestos de forma comprensible.
- **No realiza el cálculo principal.**
- **No garantiza resultados.**

## 14. Arquitectura objetivo resumida

Target de alto nivel para el despliegue P0. El diseño técnico detallado se
mantendrá en `docs/architecture/current-and-target.md` y documentos asociados.

### Servicios obligatorios P0

- **S3 privado**: hosting de frontend estático + almacenamiento de adjuntos.
- **CloudFront**: CDN con Origin Access Control (OAC).
- **API Gateway HTTP API**: entrada pública a la API.
- **Lambda**: cómputo (Express serverless, modular monolith).
- **Aurora PostgreSQL Serverless v2**: base de datos.
- **RDS Data API**: acceso desde Lambda sin pools.
- **Amazon Cognito**: identidad gestionada en staging/producción.
- **Amazon Bedrock**: agente multimodal (tool calling + visión).
- **Amazon Transcribe**: STT.
- **Amazon Polly**: TTS.
- **Amazon SES**: correos de notificación y enlaces.
- **Secrets Manager**: secretos de aplicación.
- **CloudWatch**: logs y métricas básicas.
- **CDK**: infraestructura como código reproducible.

### Solo desarrollo/tests

- Autenticación local (cookie HMAC) solo para dev y tests.
- PostgreSQL local para desarrollo.
- Adjuntos en disco local para desarrollo.

### Alternativa evaluada y no seleccionada

- **Amplify Hosting**: evaluado por conveniencia de deploys por rama; descartado
  por menor control sobre cache, headers y configuración de origen; mayor
  acoplamiento innecesario para este alcance.

### Servicios no prioritarios o evitados salvo justificación

- NAT Gateway.
- ECS/Fargate.
- RDS Proxy.
- OpenSearch.
- DynamoDB.
- Step Functions.
- Kinesis.
- API Gateway WebSocket.
- WAF de pago.
- SageMaker.
- Modelos provisionados de Bedrock.

## 15. Modelo de conectividad y degradación

### Disponible offline

- Shell de la PWA y recursos estáticos previamente cacheados por el service
  worker.
- Navegación posible sobre páginas cuyo shell y assets ya estén disponibles.
- Estado en memoria de React Query durante la sesión actual (no persistido
  durablemente en disco salvo evidencia específica).
- Formularios locales para captura de datos.
- Cola de mutaciones persistida en IndexedDB (Dexie).
- Indicador de estado de sincronización.

La lectura durable offline de todos los dominios agrícolas no debe prometerse
hasta que exista evidencia e implementación específica de persistencia en
IndexedDB o similar para queries. Actualmente, la persistencia offline garantizada
se limita a la cola de mutaciones y al idMap de reconciliación.

### Requiere conectividad

- Agente Bedrock (consultas, tool calling).
- Voz en tiempo real (Transcribe, Polly).
- Envío de correo (SES).
- Procesamiento de imágenes (Bedrock multimodal).
- Datos meteorológicos nuevos (Open-Meteo).
- Operaciones de la tienda pública (P1).
- Login y gestión de sesión.
- Cualquier lectura de datos que no esté ya en memoria o cache del navegador.

### Comportamiento sin conexión

- La interfaz de agente y voz muestra estado "sin conexión" y se deshabilita.
- La captura de datos agrícolas (formularios + cola) sigue funcionando.
- Las mutaciones se encolan y se sincronizan al recuperar conexión.
- No se simula funcionalidad que no está disponible.
- Si React Query no tiene datos en memoria, las vistas pueden mostrar estado
  vacío o de carga hasta recuperar conexión.

## 16. Golden paths resumidos

Resumen de los flujos principales. El documento detallado con pasos exactos se
mantendrá en `docs/product/golden-paths-p0-p1.md` (documento planificado).

### P0 — Flujo principal

1. Usuario consulta al Asistente AGROSBO (texto o voz).
2. Agente lee datos reales vía herramientas.
3. Agente navega visiblemente a la sección relevante.
4. Agente prepara borrador de acción (ej. tarea, observación).
5. Usuario confirma.
6. Mutación entra a la cola offline.
7. Se sincroniza idempotentemente al servidor.
8. Queda registrada en auditoría.
9. SES envía correo a un colaborador externo.
10. Colaborador abre enlace seguro.
11. Colaborador responde (acepta/rechaza/aclara).
12. Estado de colaboración se actualiza.
13. Usuario sube fotografía agrícola.
14. Bedrock produce evaluación visual preliminar.
15. Usuario crea observación o tarea desde la evaluación.
16. Usuario consulta escenario de retraso de riego.
17. IrrigationDelayScenario calcula; LLM explica.

### P1 — Flujo tienda pública

1. Productor publica un producto (selección de inventario/cosecha).
2. Visitante accede vía URL pública o código QR.
3. Visitante envía solicitud de compra sin registrarse.
4. Productor recibe notificación.
5. Productor compara solicitudes con criterios explícitos (agente puede
   explicar).
6. Productor decide y abre WhatsApp prellenado.
7. Envío siempre humano.

## 17. Métricas de éxito

Métricas verificables y prudentes para evaluar la entrega.

| Métrica | Criterio |
| --- | --- |
| P0 completo | Todas las capacidades de la sección 6 demostrables |
| P1 completo | Todas las capacidades de la sección 7 demostrables |
| Golden path reproducible | Demo ejecutable de extremo a extremo sin ambigüedad |
| Mutaciones sin confirmación | Cero (ninguna mutación ejecutada sin confirmación del usuario) |
| SQL generado por LLM ejecutado | Cero |
| Acciones duplicadas por reintento | Cero en pruebas de idempotencia |
| Estados de colaboración auditables | Historial completo por colaboración |
| Evaluación visual con límites visibles | Aviso de seguridad presente en cada evaluación |
| Escenarios con supuestos y confianza | Campos obligatorios siempre presentes |
| Despliegue reproducible | CDK deploy desde cero produce ambiente funcional |
| Presupuesto controlado | Dentro del presupuesto aprobado, con alarmas, límites de uso, trazabilidad de costos y ausencia de recursos injustificadamente costosos |
| Gates técnicos verdes | format, lint, typecheck, test, build, db:check PASS |
| Documentación coherente | Cero contradicciones con product-scope-v2 |

No se inventan porcentajes de mejora agrícola, financiera o de productividad.

## 18. Jerarquía documental

Orden de precedencia cuando existan contradicciones:

1. `docs/product/product-scope-v2.md` (este documento).
2. ADRs (`docs/adr/`).
3. Documentos de arquitectura (`docs/architecture/`).
4. Documentos de producto complementarios (personas, capacidades, golden paths).
5. Delivery roadmap y spec-map.
6. Specs (`.kiro/specs/`).
7. Steering (`.kiro/steering/`).
8. README y demo story.

El código y las pruebas son siempre la evidencia del **estado implementado**.
Los documentos fijan la **intención aprobada**. Cuando difieren, la
implementación debe actualizarse o la intención debe revisarse — nunca se
asume que el documento es correcto sin verificar el código.

## 19. Exclusiones y afirmaciones prohibidas

AGROSBO no debe afirmar ni dar a entender:

- "Garantiza cumplimiento normativo o legal."
- "Diagnostica enfermedades vegetales o animales."
- "Garantiza rendimiento agrícola o financiero."
- "Lee el correo del destinatario" (opened_link no es lectura).
- "Opera completamente offline con IA."
- "Es un marketplace."
- "Es multi-tenant completo."
- "Toma decisiones financieras o contractuales autónomas."
- "Reemplaza la asesoría de un agrónomo profesional."
- "Ejecuta acciones sin consentimiento del usuario."
- "Sus evaluaciones visuales son diagnósticos definitivos."

Cualquier material de comunicación, documentación o UI que contradiga estas
exclusiones debe corregirse inmediatamente.
