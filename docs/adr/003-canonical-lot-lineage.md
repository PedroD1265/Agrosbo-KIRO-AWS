# ADR 003 - Procedencia canónica reconstruida (sin lot_source)

Estado: Deferred (ver Estado de supersesión al final)

## Contexto

La procedencia debe permitir recorrer un embarque hasta las cosechas, parcelas y
productores de origen, conservando cantidades. Una propuesta previa introducía
una tabla `lot_source` materializada como representación paralela de la
procedencia. Mantener dos representaciones crea riesgo de divergencia entre la
fuente de verdad del balance y la vista de procedencia.

## Decisión

- No crear la tabla `lot_source` en el MVP.
- Reconstruir la procedencia exclusivamente desde `harvest_allocation`,
  `transformation_input` y `transformation_output`.
- Usar consultas recursivas de PostgreSQL para recorrer el grafo.
- Garantizar que el grafo sea acíclico: cada salida de transformación crea un
  lote nuevo y nunca se reutiliza un lote existente como salida.
- Una vista materializada solo se evaluará más adelante si se demuestra un
  problema de rendimiento.

## Alternativas

- Tabla `lot_source` materializada como fuente de consulta: descartada por
  duplicar la representación de la procedencia y arriesgar divergencia.
- Grafo en base de datos orientada a grafos: descartada; introduce un motor
  adicional sin necesidad demostrada para el volumen del MVP.

## Consecuencias

- Existe una única representación de la procedencia, derivada de las tablas de
  asignación y transformación.
- La vista de procedencia consume una consulta recursiva; su rendimiento se
  valida en el Spike B.
- Si aparece un límite de rendimiento, una vista materializada derivable y
  verificable podrá añadirse en un ADR posterior sin cambiar la fuente de verdad.

## Estado de supersesión

- Estado: **Deferred**.
- La procedencia canónica de lotes/transformaciones pertenece a la trazabilidad
  de café, que tras el giro (ADR 006) pasa a **visión futura** ("trazabilidad
  operativa" ampliada), no a regla activa del MVP agrícola.
- No se descarta: si se retoma la trazabilidad de lotes/transformaciones, esta
  decisión (reconstrucción recursiva sin `lot_source`, grafo acíclico) sigue
  siendo válida como punto de partida.
- El MVP actual NO implementa `harvest_allocation`, `transformation_input/output`
  ni consultas recursivas de procedencia.
