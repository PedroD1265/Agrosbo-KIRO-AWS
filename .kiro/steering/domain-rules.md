# AGROSBO - Reglas de dominio

Responsabilidad: reglas transversales de la plataforma. No cubre garantías
técnicas de persistencia (ver data-integrity.md). Reemplaza las reglas previas
específicas de trazabilidad de café (transformaciones, embarques, sello), que
quedan como visión de trazabilidad futura, no como reglas activas del MVP.

## Cantidades y costos

- MUST tratar cantidades y costos de forma **determinista** (sin factores
  ocultos ni estimaciones automáticas).
- El **inventario nunca queda negativo** salvo por un evento explícito y
  registrado; toda salida valida stock (`InventoryStockError` / constraint
  `stock >= 0`).
- MUST registrar cada movimiento de inventario con su delta, motivo y, cuando
  aplique, costo unitario y total.
- MUST asociar costos a una moneda explícita (por defecto BOB).

## Idempotencia y sincronización

- MUST tratar las mutaciones como **idempotentes** por clave de cliente
  (`X-Idempotency-Key`), de modo que un reintento no duplique registros.
- MUST reconciliar IDs temporales del cliente con IDs reales del servidor.
- Ver offline-first.md para el protocolo completo.

## Estados explícitos

- MUST usar estados explícitos y enumerados (operationalStatus, taskStatus,
  irrigationStatus, etc.); no estados implícitos derivados de la ausencia de
  datos.
- MUST NOT borrar silenciosamente historial; una corrección se registra como
  un evento nuevo, no como sobrescritura invisible.

## Alertas

- Las alertas son **derivadas y deterministas** del estado actual (inventario
  bajo, riego vencido, observación sin atender, tarea vencida, carencia activa,
  colmena sin inspección). No se persisten como fuente de verdad.
- MUST ser **accionables** (entidad + motivo).

## Separación comercio / operación (futuro, aún no implementado)

Cuando se implemente el comercio agrícola:
- MUST separar **inventario interno** de **publicaciones** (listings). Una
  publicación referencia inventario, no lo reemplaza.
- MUST modelar **solicitud**, **cotización** y **orden** como entidades
  distintas con historial de estados; una conversación NO sustituye a una
  solicitud u orden estructurada.
- MUST NOT ejecutar ninguna acción financiera o contractual automática por IA;
  toda acción requiere confirmación humana.

## Tenancy (futuro)

- Cuando se implemente multi-tenancy, todo dato de producción MUST asociarse a
  una organización/granja y NO depender permanentemente de `org-default`.

## Trazabilidad de cambios

- MUST mantener trazabilidad de acciones sensibles (creación/edición de
  inventario, aplicaciones, cosechas, costos, usuarios).
- MUST NOT usar IA para autorizar operaciones ni para calcular balances.
