# AGROSBO - Integridad de datos

Responsabilidad: garantías técnicas de consistencia y disponibilidad calculada.
No repite la semántica de dominio (ver domain-rules.md).

## Transaccionalidad

- MUST ejecutar cada operación de balance (transformación, asignación,
  incorporación a embarque, sello) en una transacción única vía Data API.
- MUST hacer rollback total de la operación ante cualquier fallo dentro de ella.
- MUST NOT dejar estados parciales tras una operación fallida.

## Disponibilidad

- MUST calcular la disponibilidad desde asignaciones, consumos y reservas.
- MUST NOT usar un campo `available_kg` como fuente independiente de verdad.
- Cualquier optimización almacenada MUST ser derivable y verificable frente al
  cálculo canónico.

## Constraints

- MUST enforcar no-negatividad de cantidades disponibles.
- MUST enforcar la regla de balance suma(inputs) = suma(outputs) + loss_kg antes
  del commit.
- MUST enforcar claves foráneas entre las entidades de la cadena de procedencia.

## Snapshot

- `shipment_snapshot` es inmutable.
- MUST almacenar snapshot_json, snapshot_sha256, package_s3_key, package_sha256,
  sealed_by y sealed_at.
- MUST NOT recalcular un snapshot ya sellado.
- MUST verificar el paquete contra package_sha256 antes de entregarlo.

## Auditoría

- `audit_event` es append-only.
- MUST registrar acciones sensibles: creación de lotes, transformaciones,
  incorporación a embarques, revisiones, sellado, generación de paquete y
  detección de posible duplicado.
- MUST NOT exponer endpoints de actualización o eliminación de `audit_event`.
