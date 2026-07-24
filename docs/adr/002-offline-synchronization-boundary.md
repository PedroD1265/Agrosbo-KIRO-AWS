# ADR 002 - Frontera de sincronización offline

Estado: Aceptado

## Contexto

El Capturista trabaja en campo sin conexión y alimenta datos de origen
(productor, parcela, cosecha, GPS, fotos, documentos). Las operaciones de
trazabilidad (lotes, transformaciones, embarques, revisión, sello, extracción)
requieren integridad de balances y estado compartido, por lo que no pueden
ocurrir offline. Necesitamos una frontera clara entre lo que se captura offline
y lo que se procesa online, y un protocolo de sincronización robusto ante
reintentos.

## Decisión

- Solo la captura de origen ocurre offline; todas las operaciones de balance y
  estado compartido son online.
- Cada operación local lleva client_op_id, temp_entity_id, operation_type,
  payload, dependency_op_ids, created_at, attempts, status y last_error.
- La sincronización procesa operaciones en orden de dependencias, es idempotente
  por client_op_id y reconcilia temp_entity_id -> server_id devolviendo el mapa.
- Se usa una transacción corta por operación o por conjunto inseparable; la cola
  completa no se procesa en una sola transacción.
- Una operación fallida no revierte operaciones independientes ya confirmadas.
- Los duplicados no se fusionan automáticamente; se marcan para revisión humana.
- Los blobs se suben a S3 fuera de la transacción PostgreSQL; primero la subida,
  luego la metadata.

## Alternativas

- Procesar toda la cola en una única transacción: descartada; un fallo aislado
  revertiría trabajo válido y ampliaría la ventana de bloqueo.
- Fusión automática de duplicados: descartada; puede destruir procedencia real;
  se prefiere marcar para revisión.
- Offline total (incluyendo lotes/transformaciones): descartada por la
  imposibilidad de garantizar balances deterministas sobre estado compartido.

## Regla provisional de detección de posibles duplicados

Para el Spike A y el dataset del hackathon, marcar como `possible_duplicate`
cuando coincidan TODOS los campos:
- cooperative_id, producer_id, parcel_id, product_state, harvested_date,
  quantity_kg (redondeada a 2 decimales).

Consecuencia: solo advertencia para revisión humana.
No fusionar, eliminar, sobrescribir, rechazar ni modificar otro registro.
Esta regla es provisional y puede cambiar tras observar datos reales.

## Consecuencias

- El cliente mantiene una cola durable en IndexedDB con estados y errores
  visibles.
- El servidor debe garantizar idempotencia y reconciliación de IDs temporales.
- La subida de archivos y la sincronización de metadata son pasos separados y
  reintetables sin duplicar documentos.
- La detección de posibles duplicados es una advertencia, nunca una acción
  automática.
- Este es el mayor riesgo técnico y se valida primero en el Spike A.

## Resultado del Spike A

Validado con 22 tests (13 PostgreSQL + 7 IndexedDB + 2 concurrencia). Estado:
PASS.

Hallazgos incorporados:
- `temp_entity_id` es TEXT (no UUID) con validación: max 128 chars, alfanumérico
  + hyphens + underscores.
- `client_op_id` es UUID v4 validado.
- La detección de duplicados ocurre ANTES del INSERT, no después.
- Concurrencia multi-dispositivo simultánea tiene una ventana de carrera
  documentada. Para el MVP single-device, no es un problema. Para producción
  futura: advisory lock o serializable isolation.
- La persistencia en IndexedDB (probada con fake-indexeddb) sobrevive a la
  destrucción y recreación de la instancia de la cola.
