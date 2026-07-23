# Requirements - project-foundation-and-risk-spikes

## Introducción

Esta primera Spec establece la base mínima del repositorio y valida los tres
riesgos técnicos más altos de AGROSBO mediante spikes descartables: la
sincronización offline (Spike A), la reconstrucción de procedencia por consultas
recursivas (Spike B) y la extracción documental (Spike C). El objetivo es
producir evidencia y decisiones, no funcionalidad final de otras Specs.

Los requisitos usan la notación EARS (Easy Approach to Requirements Syntax).

## Requisitos de producto y fundación

### R1 - Estructura inicial del repositorio
Como equipo, queremos una estructura de repositorio con capas separadas para
poder desarrollar sin mezclar dominio, aplicación e infraestructura.

Criterios de aceptación:
1. THE SYSTEM SHALL proveer las carpetas `/web`, `/api`, `/infra`, `/docs`,
   `/spikes` y `.kiro/`.
2. THE SYSTEM SHALL mantener el código de spikes dentro de `/spikes`, separado
   del código de producción.
3. WHEN un spike concluye, THE SYSTEM SHALL conservar su código como descartable
   y no promoverlo a producción sin una tarea explícita.

### R2 - Alcance de la fundación
1. THE SYSTEM SHALL limitarse a estructura, configuración de calidad y spikes.
2. THE SYSTEM SHALL NOT implementar pantallas finales, endpoints de producción
   ni migraciones definitivas de otras Specs.

### R2b - Infraestructura de laboratorio
1. THE SYSTEM SHALL crear únicamente recursos mínimos de laboratorio necesarios
   para ejecutar los spikes (bucket S3 de lab, Aurora PostgreSQL Serverless v2 +
   Data API solo si Spike B lo requiere).
2. THE SYSTEM SHALL nombrar los recursos de lab con prefijo `agrosbo-dev-spike`.
3. THE SYSTEM SHALL documentar comandos de creación y destrucción.
4. THE SYSTEM SHALL establecer límites de costo.
5. THE SYSTEM SHALL NOT crear infraestructura de producción durante los spikes.

## Requisitos de sincronización (Spike A)

### R3 - Cola de operaciones offline
1. WHEN el Capturista crea un registro sin conexión, THE SYSTEM SHALL registrar
   una operación local con client_op_id, temp_entity_id, operation_type,
   payload, dependency_op_ids, created_at, attempts, status y last_error.
2. THE SYSTEM SHALL permitir dependencias entre operaciones mediante
   dependency_op_ids (producer -> parcel -> harvest).

### R4 - Sincronización idempotente y con dependencias
1. WHEN se recupera la conexión, THE SYSTEM SHALL procesar las operaciones en
   orden de dependencias.
2. THE SYSTEM SHALL ser idempotente por client_op_id, de modo que un reintento
   no cree registros duplicados.
3. WHEN una operación se aplica, THE SYSTEM SHALL reconciliar temp_entity_id a
   server_id y devolver el mapa al cliente.
4. THE SYSTEM SHALL usar una transacción corta por operación o por conjunto
   inseparable.
5. IF una operación falla, THEN THE SYSTEM SHALL aislar ese fallo sin revertir
   operaciones independientes ya confirmadas.
6. IF una operación falla, THEN THE SYSTEM SHALL exponer el fallo en la cola y
   NOT ocultarlo.
7. WHEN dos operaciones parecen duplicar una misma cosecha (coinciden
   cooperative_id, producer_id, parcel_id, product_state, harvested_date y
   quantity_kg redondeada a 2 decimales), THE SYSTEM SHALL marcarlas como
   `possible_duplicate` para revisión humana.
8. THE SYSTEM SHALL NOT fusionar, eliminar, sobrescribir, rechazar
   automáticamente ni modificar silenciosamente otro registro ante un posible
   duplicado.
9. Esta regla de detección es provisional para el dataset del hackathon y puede
   cambiar tras observar datos reales.

## Requisitos de procedencia (Spike B)

### R5 - Datos mínimos de procedencia
1. THE SYSTEM SHALL crear datos desechables con dos cosechas, dos lotes
   iniciales, una combinación (merge), una división (split) y una pérdida.
2. THE SYSTEM SHALL crear los lotes iniciales únicamente desde
   harvest_allocation.
3. WHEN una transformación produce salidas, THE SYSTEM SHALL crear un lote nuevo
   por cada salida y NOT reutilizar un lote existente como salida.

### R6 - Reconstrucción recursiva
1. WHEN se consulta un lote o embarque final, THE SYSTEM SHALL reconstruir por
   consulta recursiva la cadena hasta transformaciones, lotes iniciales,
   cosechas, parcelas y productores.
2. THE SYSTEM SHALL reconstruir la procedencia solo desde harvest_allocation,
   transformation_input y transformation_output.
3. THE SYSTEM SHALL producir un grafo acíclico.
4. THE SYSTEM SHALL verificar que suma(inputs) = suma(outputs) + loss_kg en la
   transformación de prueba.

## Requisitos de documentación / extracción (Spike C)

### R7 - Benchmark documental
1. THE SYSTEM SHALL procesar documentos de una sola página en las tres
   categorías de prueba.
2. WHEN las credenciales están disponibles, THE SYSTEM SHALL comparar Amazon
   Textract y Azure Document Intelligence sobre exactamente los mismos
   documentos.
3. IF Azure no está disponible durante el spike, THEN THE SYSTEM SHALL continuar
   con Textract como proveedor por defecto.
4. THE SYSTEM SHALL medir campos esperados encontrados, campos correctos,
   errores, confianza, latencia, esfuerzo de integración, costo estimado y
   facilidad de revisión humana.
5. THE SYSTEM SHALL registrar resultados de confianza por campo, NOT solamente
   un promedio del documento.
6. THE SYSTEM SHALL usar un umbral de confianza configurable (valor inicial de
   laboratorio: 0.85) y NOT presentarlo como estándar universal.
7. WHEN un campo obligatorio está ausente o bajo el umbral, THE SYSTEM SHALL
   marcar el documento para revisión humana.
8. THE SYSTEM SHALL producir un informe de decisión y NOT un pipeline de
   producción.
9. THE SYSTEM SHALL seleccionar un único proveedor para el MVP.
10. El spike puede recomendar un umbral diferente basado en evidencia medida.

## Requisitos de seguridad

### R8 - Manejo de credenciales y datos
1. THE SYSTEM SHALL gestionar credenciales de nube fuera del código fuente.
2. THE SYSTEM SHALL NOT commitear secretos ni credenciales al repositorio.
3. THE SYSTEM SHALL usar datos desechables y NOT PII real de productores en los
   spikes.

## Requisitos de evidencia

### R9 - Evidencia por spike
1. WHEN un spike concluye, THE SYSTEM SHALL producir evidencia registrada (log,
   salida de consulta o informe) que demuestre el criterio evaluado.
2. THE SYSTEM SHALL documentar por cada spike un resultado de aceptación o
   descarte con su justificación.
