# AGROSBO - Reglas de dominio

Responsabilidad: semántica de producto, cantidades, transformaciones, embarques,
revisión y sello. No cubre garantías técnicas de persistencia (ver
data-integrity.md).

## Cantidades

- Unidad única del MVP: kilogramo.
- MUST NOT crear masa en ninguna operación.
- MUST registrar toda pérdida con cantidad y motivo.
- Un lote MAY contener producto de varios productores.
- Una cosecha MAY aportar parcialmente a varios lotes iniciales.

## Cosecha y lotes iniciales

- Una cosecha pertenece a un productor y una parcela y tiene cantidad en kg.
- Los lotes iniciales se crean únicamente desde `harvest_allocation`.
- `harvest_allocation` registra harvest_id, lot_id y quantity_kg.
- MUST NOT permitir que la suma asignada desde una cosecha supere su cantidad
  original.

## Transformaciones

- Tipos: `split`, `merge`, `process` (cereza -> pergamino -> verde).
- Una transformación consume uno o varios lotes y produce uno o varios lotes
  nuevos.
- MUST crear un lote nuevo por cada salida.
- MUST NOT reutilizar un lote existente como salida.
- `transformation_input`: transformation_id, source_lot_id, quantity_kg.
- `transformation_output`: transformation_id, result_lot_id, quantity_kg.
- La transformación contiene loss_kg y loss_reason.
- MUST exigir loss_reason cuando loss_kg > 0.
- Regla de balance exacta: suma(inputs) = suma(outputs) + loss_kg.
- MUST NOT asumir factores de conversión automáticos; toda diferencia es pérdida
  registrada.
- MUST NOT usar IA en balances ni en autorización de transformaciones.

## Procedencia

- MUST reconstruir la procedencia desde `harvest_allocation`,
  `transformation_input` y `transformation_output`.
- MUST mantener el grafo acíclico (cada salida es un lote nuevo).
- MUST NOT mantener una segunda representación de la procedencia.

## Embarques

- `shipment_lot` asigna una cantidad de un lote a un embarque.
- MUST NOT permitir que la suma asignada a embarques activos supere la
  disponibilidad del lote.
- MUST NOT cambiar la composición de un embarque sellado; una modificación
  posterior exige una nueva versión del snapshot.

## Revisión de completitud (determinista)

- Verifica: procedencia presente, cantidades explicadas, sin negativos, salidas
  no superiores a entradas, entidades existentes, cosechas de origen presentes,
  documentos obligatorios presentes, certificado no vencido, sin lotes
  bloqueados, snapshot construible.
- MUST devolver hallazgos accionables con entidad y cantidad.
- `review_run` y `review_finding` son inmutables.
- MUST NOT usar campos `resolved`/`resolved_at`; una corrección se demuestra con
  una nueva `review_run`.
- MUST NOT usar IA en estas validaciones.

## Detección provisional de posibles duplicados

Regla provisional para el dataset del hackathon. Puede cambiar tras observar
datos reales.

Marcar como `possible_duplicate` CUANDO coincidan TODOS:
- cooperative_id
- producer_id
- parcel_id
- product_state
- harvested_date
- quantity_kg redondeada a dos decimales.

- MUST marcar como advertencia para revisión humana solamente.
- MUST NOT fusionar, eliminar, sobrescribir, rechazar automáticamente ni
  modificar silenciosamente otro registro.

## Confianza documental

Regla provisional de laboratorio para la extracción de campos.

- El umbral MUST ser configurable.
- Valor inicial de laboratorio: 0.85.
- MUST NOT presentar el umbral como estándar universal.
- WHEN un campo obligatorio está ausente, MUST requerir revisión humana.
- WHEN un campo obligatorio tiene confianza bajo el umbral, MUST requerir
  revisión humana.
- El spike puede recomendar otro valor basado en evidencia.
- MUST registrar resultados de confianza por campo, no solo un promedio del
  documento.

## Sello y versiones

- El expediente es inmutable y versionable.
- MUST generar el snapshot solo tras una revisión aprobada.
- MUST congelar la vigencia documental evaluada en el momento del sello.
- MUST generar el paquete desde el snapshot, no desde datos vivos.
- Una corrección genera una versión nueva con `replaces_snapshot_id`.
- MUST NOT sobrescribir una versión anterior.
