# AGROSBO - Evolución de la plataforma

Explica la postura de modularidad y los dominios futuros. Ver ADR 009. Ninguno de
los dominios "futuros" está implementado.

## Monolito modular (postura actual)

- Un backend Express desplegable como una unidad, organizado por módulos de
  dominio (`api/src/*.ts`), con contratos compartidos en `shared/`.
- Objetivo de despliegue: Lambda (ADR 007). No microservicios.

## Por qué NO microservicios (todavía)

- Volumen y equipo actuales no justifican la complejidad operativa (despliegue,
  observabilidad, consistencia distribuida) de múltiples servicios.
- El monolito modular permite aislar dominios por módulo y evolucionar
  incrementalmente.
- Se dividirá solo cuando una necesidad real (escala, aislamiento, equipos
  independientes) lo justifique, con un ADR que lo respalde.

## Tenancy (transversal, futura)

Capa de aislamiento por organización/granja (ver `multi-tenancy-plan.md`), no un
dominio en sí. Debe aplicarse antes de exponer comercio o mensajería multiusuario.

## Dominio: Marketplace de productos (future, NO implementado)

Entidades propuestas (separadas del inventario interno):
- `listing` (publicación que referencia inventario), `availability`, `offer`,
  `order`, `order_item`, historial de estado.

Reglas:
- Una publicación **referencia** inventario; no lo reemplaza ni lo duplica.
- Comprador y vendedor son organizaciones distintas; autorización por membresía.

## Dominio: Servicios agrícolas (future/differentiator, NO implementado)

Entidades propuestas:
- `provider_profile`, `equipment`, `service_request`, `quote`, `appointment`,
  `work_order`, historial, mensajes asociados.

Reglas:
- `service_request`, `quote` y `work_order` son entidades **distintas** con
  estados explícitos.
- Una conversación **no** sustituye a una solicitud u orden estructurada.

## Dominio: Mensajería y notificaciones (future, NO implementado)

- Mensajes asociados a solicitudes/órdenes; notificaciones.
- Candidatos AWS diferidos: API Gateway WebSocket, SES, SQS. Requiere Spec.

## Dominio: Copiloto de datos (differentiator, NO implementado)

- Capa de solo lectura sobre herramientas autorizadas. Ver `farm-assistant-plan.md`.

## Orden de evolución recomendado

Operaciones (actual) → infraestructura serverless → diferenciadores (asistente,
primer flujo de servicio) → comercio/servicios completos → mensajería.
