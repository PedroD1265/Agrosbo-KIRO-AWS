# ADR 017 — Colaboradores externos y notificaciones

- **Estado**: Accepted.
- **Fecha**: julio 2026.

## Contexto

AGROSBO necesita comunicarse con personas externas a la organización sin
requerir que creen una cuenta completa. Se requiere un mecanismo seguro,
auditable y con semántica honesta de estados.

## Decisión

### Colaborador interno

- Cuenta completa con usuario, contraseña (o Cognito) y rol.
- Perfil con nombre, contacto, habilidades, disponibilidad, tarifa opcional.
- Historial de tareas y actividades.

### Colaborador externo

- Sin cuenta completa.
- Acceso limitado a una tarea específica.
- Token opaco generado con entropía criptográficamente segura.
- Solo un hash resistente del token se persiste en la base de datos.
- Algoritmo de hash, longitud del token y codificación definitivos se fijan en
  la Spec de implementación. SHA-256 con token de alta entropía se registra como
  opción recomendada, no como schema definitivo.
- Expiración configurable por TTL.
- Revocación manual posible.
- Invalidación al alcanzar un estado terminal cuando corresponda.
- Una simple apertura del enlace no lo invalida automáticamente.
- Rate limiting en el endpoint público.
- Datos mínimos expuestos (solo lo necesario para la tarea).
- Puede: aceptar, rechazar o solicitar aclaración.
- HTTPS obligatorio en producción.

### Amazon SES

- SES puede iniciar en sandbox.
- Sandbox restringe destinatarios a direcciones verificadas.
- Para enviar a colaboradores externos reales se requiere acceso de producción e
  identidad verificada.
- Si SES rechaza la solicitud, no se registra sent; se conserva como fallo
  técnico registrado; el usuario puede reintentar el envío tras corrección.
- `sent` solo se registra cuando SES acepta la solicitud y retorna message ID.
- `delivered` solo se registra tras evento verificable de SES.
- Webhooks/eventos de SES deben autenticarse o validarse según el mecanismo
  proporcionado por SES (SNS topic signatures o similar).
- Eventos duplicados deben deduplicarse.
- No se debe asumir orden de llegada de eventos.
- `opened_link` puede ocurrir antes de que se procese `delivered`.
- Ningún evento prueba lectura humana del correo.

### Estados de notificación

| Estado | Significado |
| --- | --- |
| sent | SES aceptó la solicitud; message ID almacenado. No significa entrega. |
| delivered | Evento verificable de SES; aceptación por servidor destino. No garantiza lectura. |
| opened_link | Solicitud válida al endpoint del enlace. Puede ser escáner automático. No prueba lectura. |
| responded | Respuesta estructurada válida recibida. |
| completed | Tarea o colaboración alcanzó su estado final. |

### Reglas

- No usar "read" como estado.
- No usar píxel de apertura como evidencia principal.
- Eventos de notificación se modelan separados de la entidad de colaboración.
- Multi-tenancy completo es P2 y no bloquea esta capacidad.
- El despliegue P0/P1 es single-organization.

## Alternativas consideradas

1. **JWT stateless como token de acceso**: menor control sobre revocación y
   estado; no permite invalidar antes de expiración sin blacklist; descartado
   como mecanismo principal.
2. **Cuenta obligatoria para externos**: fricción excesiva; descartado.
3. **Multi-tenancy completo como prerrequisito**: bloquearía P0; descartado.
4. **Estado "read" basado en píxel de apertura**: no verificable honestamente;
   descartado.

## Consecuencias positivas

- Acceso mínimo sin cuenta ni contraseña.
- Seguridad verificable: hash, TTL, revocación, rate limit.
- Semántica honesta de estados.
- Auditoría completa del ciclo de colaboración.
- No bloquea por multi-tenancy.

## Consecuencias negativas

- El colaborador externo no puede hacer seguimiento propio sin otro enlace.
- Rate limiting debe calibrarse para no bloquear uso legítimo.
- Expiración por TTL puede frustrar si el colaborador tarda en responder.

## Riesgos

- Token en URL puede ser interceptado si no se usa HTTPS (mitigado: HTTPS
  obligatorio).
- Escáneres de seguridad corporativos pueden triggear opened_link.
- Eventos SES pueden llegar fuera de orden o duplicados.

## Referencias

- [`../product/product-scope-v2.md`](../product/product-scope-v2.md) §10.
- [`./015-agent-action-and-confirmation-model.md`](./015-agent-action-and-confirmation-model.md).
- [`../product/personas-and-permissions.md`](../product/personas-and-permissions.md).
- [`../architecture/collaboration-model.md`](../architecture/collaboration-model.md).
