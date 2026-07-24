# AGROSBO - Offline-first

Responsabilidad: qué funciona sin conexión y cómo sincroniza. No repite reglas
de dominio ni de integridad de balances.

## Permitido offline

- Crear productor, parcela y cosecha.
- Capturar GPS y fotografía.
- Capturar archivo pendiente.
- Editar registros que todavía no fueron sincronizados.
- Consultar datos previamente descargados.

## Obligatoriamente online

- Crear lotes y asignar cosechas.
- Dividir, combinar y procesar (transformaciones).
- Crear embarques, revisar, sellar y generar paquete.
- Extraer documentos con IA.

## Operación local (cola)

Cada operación local MUST tener: client_op_id, temp_entity_id, operation_type,
payload, dependency_op_ids, created_at, attempts, status, last_error.

## Convención de identificadores

- client_op_id: MUST ser UUID v4.
- temp_entity_id: MUST ser TEXT no vacío, máximo 128 caracteres, solo
  alfanumérico + guiones + guiones bajos.
- server IDs: UUID v4 generados por PostgreSQL.
- MUST validar formato antes de procesar un batch; rechazar si algún
  identificador viola el formato.

## Persistencia del cliente

- MUST persistir la cola en IndexedDB (no solo en memoria).
- MUST sobrevivir a la destrucción y recreación de la instancia.
- MUST conservar blobs pendientes y su relación con la operación de metadata.
- MUST archivar una operación ONLY después de confirmación exitosa.
- MUST mantener operaciones fallidas para reintento.
- MUST NOT perder operaciones pendientes ante cierre de la app.

## Sincronización

- MUST procesar operaciones en orden de dependencias.
- MUST ser idempotente por client_op_id (reintento = no-op).
- MUST reconciliar temp_entity_id -> server_id y devolver el mapa al cliente.
- MUST usar una transacción corta por operación o por conjunto inseparable.
- MUST NOT procesar toda la cola dentro de una única transacción.
- MUST NOT revertir operaciones independientes ya confirmadas por el fallo de
  otra.
- MUST NOT ocultar fallos; una operación fallida permanece visible en la cola.
- MUST NOT fusionar duplicados automáticamente; marcarlos para revisión humana.
- MUST aplicar la regla provisional de posible duplicado definida en
  domain-rules.md.

## Archivos (blobs)

Los blobs NO participan en transacciones PostgreSQL. Al recuperar conexión:

1. El cliente solicita una URL prefirmada.
2. Sube el archivo a S3.
3. Conserva la clave resultante.
4. Sincroniza la metadata en PostgreSQL.
5. Si la subida falla, el archivo permanece pendiente.
6. Reintentar MUST NOT crear archivos ni documentos duplicados.

- MUST separar la subida del archivo de la sincronización de su metadata.
- MUST NOT incluir la subida de archivos dentro de una transacción PostgreSQL.
