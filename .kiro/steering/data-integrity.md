# AGROSBO - Integridad de datos

Responsabilidad: garantías técnicas de consistencia. No repite la semántica de
dominio (ver domain-rules.md). Refleja la implementación real y el objetivo.

## Fuente de verdad

- **PostgreSQL** es la única fuente de verdad en modo persistente.
- El modo memoria (`MemStorage`) es solo para desarrollo y cubre un subconjunto;
  NO debe usarse como fuente de verdad ni en pruebas de integridad completas.

## Transaccionalidad

- MUST ejecutar en una transacción las operaciones que combinan varias
  escrituras dependientes (p. ej. movimiento de inventario: actualizar stock +
  registrar movimiento — ver `dbStorage.ts::createInventoryMovement`).
- MUST hacer rollback total ante fallo dentro de la operación.
- MUST NOT dejar estados parciales.

## Constraints (implementadas en `shared/schema.ts`)

- `stock >= 0`, `min >= 0`, `unitCost >= 0` en inventario.
- `progress` entre 0 y 100 en campañas.
- `quantity > 0` en lotes de cosecha; `amount >= 0` en gastos y mano de obra.
- `sizeBytes` de adjuntos entre 0 y 10 MB.
- Claves foráneas: `farms→organizations`, `inventoryMovements→inventoryItems`,
  `hives→apiaries`, `hiveInspections→hives`, `honeyHarvests→apiaries`.
- Índices por scope, fecha y estado en las tablas operativas.

## Idempotencia

- MUST garantizar idempotencia HTTP por clave (`idempotency_keys`, estado
  `processing|completed`, TTL 24 h) con fallback en memoria cuando no hay DB.
- La sincronización offline se apoya en esta idempotencia (ver offline-first.md).

## Auditoría

- MUST conservar campos de autoría/tiempo (`createdBy`, `createdAt`) donde
  existan.
- Estado objetivo: bitácora append-only de acciones sensibles; hoy la auditoría
  es parcial. NO afirmar auditoría completa.

## Consistencia de inventario

- La disponibilidad se deriva de `stock` y movimientos; MUST validar stock antes
  de una salida (constraint + verificación en servicio).

## Cotizaciones y órdenes (futuro)

- Cuando se implementen: solicitudes, cotizaciones y órdenes MUST tener estados
  explícitos e inmutabilidad del historial (no sobrescritura).

## Tenancy (futuro)

- Toda consulta MUST quedar limitada por organización/granja cuando se
  implemente tenancy; los IDs en la URL NO conceden acceso por sí mismos.

## Respuestas de IA (futuro)

- Las respuestas del copiloto MUST derivarse de herramientas de solo lectura
  sobre datos reales; NO SQL libre, NO datos inventados, con RBAC obligatorio.
