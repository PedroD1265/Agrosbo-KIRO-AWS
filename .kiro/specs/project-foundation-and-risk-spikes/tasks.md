# Tasks - project-foundation-and-risk-spikes

Reglas: tareas pequeñas, con dependencias explícitas. Las tareas marcadas
[paralelizable] pueden ejecutarse en paralelo con otras del mismo grupo. Cada
tarea produce evidencia. El código de spikes es descartable y NO se promueve a
producción automáticamente.

La ejecución se realiza por CHECKPOINTS. Cada checkpoint requiere autorización
explícita.

NO ejecutar estas tareas hasta recibir autorización explícita.

## Grupo 0 - Fundación (Checkpoint 0)

- [x] 0.1 Crear la estructura de carpetas del repositorio (`/web`, `/api`,
  `/infra`, `/docs`, `/spikes`, `.kiro`).
  - Evidencia: árbol de directorios.
  - Dependencias: ninguna.
  - Requisitos: R1.

- [x] 0.2 [paralelizable] Configurar herramientas de calidad en la raíz
  (formato, lint, typecheck, build) sin lógica de negocio.
  - Evidencia: comandos ejecutables en verde sobre un archivo trivial.
  - Dependencias: 0.1.
  - Requisitos: R2, R8.

- [x] 0.3 [paralelizable] Añadir gestión de secretos fuera del código y
  `.gitignore` que excluya credenciales y artefactos locales.
  - Evidencia: verificación de que no hay secretos versionados.
  - Dependencias: 0.1.
  - Requisitos: R8.

- [x] 0.4 [paralelizable] Crear los Hooks básicos autorizados (secret scan,
  format, lint, typecheck, unit tests, build).
  - Evidencia: hooks creados y funcionales.
  - Dependencias: 0.2.
  - Requisitos: R2, R8.

- [x] 0.5 Preparar la definición de infraestructura de laboratorio (CDK stack)
  sin desplegarlo aún. Documentar comandos de creación/destrucción y límites de
  costo. Recursos: Aurora PostgreSQL Serverless v2 + Data API, bucket S3, con
  prefijo `agrosbo-dev-spike`.
  - Evidencia: archivo(s) CDK y documentación de comandos.
  - Dependencias: 0.1.
  - Requisitos: R2b.

DETENER tras completar Grupo 0. Entregar informe de checkpoint.

## Grupo A - Spike Offline sync (Checkpoint A)

Requiere: Checkpoint 0 aprobado + infraestructura de lab desplegada.

- [x] A.1 Definir el esquema desechable `spike_a` y el contrato del lote de
  operaciones (client_op_id, temp_entity_id, dependency_op_ids, etc.).
  - Evidencia: definición del contrato y del esquema.
  - Dependencias: 0.5 (infra lab desplegada).
  - Requisitos: R3.

- [x] A.2 Implementar el procesamiento `POST /sync-spike`: orden por
  dependencias, transacción corta por operación, reconciliación temp->server.
  - Evidencia: log con mapa de IDs reconciliados.
  - Dependencias: A.1.
  - Requisitos: R4.1, R4.3, R4.4.

- [x] A.3 Implementar idempotencia por client_op_id y probar reintento sin
  duplicados.
  - Evidencia: corrida que reenvía el lote y muestra 0 duplicados.
  - Dependencias: A.2.
  - Requisitos: R4.2.

- [x] A.4 Probar aislamiento de fallo: una operación falla y las independientes
  ya confirmadas permanecen.
  - Evidencia: log mostrando fallo aislado y estado consistente.
  - Dependencias: A.2.
  - Requisitos: R4.5, R4.6.

- [x] A.5 Probar detección de posible duplicado de cosecha: coinciden
  cooperative_id, producer_id, parcel_id, product_state, harvested_date y
  quantity_kg (redondeada a 2 decimales). Se marca como `possible_duplicate`
  para revisión humana. No se fusiona, elimina, sobrescribe, rechaza ni modifica
  silenciosamente otro registro. Regla provisional para el hackathon.
  - Evidencia: registro marcado como `possible_duplicate` pendiente de revisión.
  - Dependencias: A.2.
  - Requisitos: R4.7, R4.8, R4.9.

- [x] A.6 Probar que la subida de archivos está separada de la transacción
  PostgreSQL (simulada o real con bucket de lab).
  - Evidencia: log mostrando subida a S3 independiente de la transacción de
    metadata.
  - Dependencias: A.2.
  - Requisitos: R4 (offline-first.md archivos).

- [x] A.7 Escribir `/spikes/spike-a-offline-sync/RESULTS.md` con PASS/PARTIAL/
  FAIL por criterio.
  - Evidencia: RESULTS.md.
  - Dependencias: A.3, A.4, A.5, A.6.
  - Requisitos: R9.

DETENER tras completar Grupo A. Entregar informe de checkpoint.

## Grupo B - Spike Procedencia (Checkpoint B)

Requiere: Checkpoint A aprobado.

- [ ] B.1 Crear el esquema desechable `spike_b` y sembrar datos mínimos (2
  productores, 2 parcelas, 2 cosechas, 2 lotes iniciales vía
  harvest_allocation con asignación parcial).
  - Evidencia: datos sembrados.
  - Dependencias: infra lab (misma BD del Spike A).
  - Requisitos: R5.1, R5.2.

- [ ] B.2 Registrar una combinación (merge) y una división (split), creando un
  lote nuevo por salida, con una pérdida (loss_kg + loss_reason). Verificar
  balance: suma(inputs) = suma(outputs) + loss_kg.
  - Evidencia: filas de transformation_input/output y balance.
  - Dependencias: B.1.
  - Requisitos: R5.3, R6.4.

- [ ] B.3 Implementar la consulta recursiva de procedencia desde un lote final
  hasta productores y parcelas. Verificar que el grafo es acíclico y que no
  existe `lot_source`.
  - Evidencia: salida del árbol de procedencia completo.
  - Dependencias: B.2.
  - Requisitos: R6.1, R6.2, R6.3.

- [ ] B.4 Verificar que un reintento de la misma transformación no duplica
  registros (idempotencia de la operación).
  - Evidencia: log sin duplicados.
  - Dependencias: B.2.
  - Requisitos: integridad.

- [ ] B.5 Escribir `/spikes/spike-b-lineage/RESULTS.md` con PASS/PARTIAL/FAIL
  por criterio y notas de rendimiento.
  - Evidencia: RESULTS.md.
  - Dependencias: B.3, B.4.
  - Requisitos: R9.

DETENER tras completar Grupo B. Entregar informe de checkpoint.

## Grupo C - Spike Extracción documental (Checkpoint C)

Requiere: Checkpoint B aprobado.

- [ ] C.1 Preparar los tres documentos de prueba de una página (sintéticos o
  públicos) y el conjunto fijo de campos esperados por categoría.
  - Evidencia: documentos y lista de campos esperados.
  - Dependencias: 0.3, 0.5 (bucket S3 de lab).
  - Requisitos: R7.1, R8.3.

- [ ] C.2 [paralelizable] Ejecutar extracción con Amazon Textract y registrar
  métricas POR CAMPO: campo esperado, campo detectado, valor correcto,
  confianza, error, latencia, revisión humana requerida (campo ausente o bajo
  0.85).
  - Evidencia: métricas por campo de Textract.
  - Dependencias: C.1.
  - Requisitos: R7.1, R7.4, R7.5, R7.6, R7.7.

- [ ] C.3 [paralelizable] Ejecutar extracción con Azure Document Intelligence si
  hay credenciales; si no, registrar indisponibilidad. Mismas métricas por campo.
  - Evidencia: métricas de Azure o nota de indisponibilidad.
  - Dependencias: C.1.
  - Requisitos: R7.2, R7.3.

- [ ] C.4 Consolidar informe comparativo. Recomendar proveedor y umbral basado
  en evidencia por campo. Seleccionar un único proveedor.
  - Evidencia: informe en `/spikes/spike-c-extraction/RESULTS.md`.
  - Dependencias: C.2, C.3.
  - Requisitos: R7.8, R7.9, R7.10, R9.

- [ ] C.5 Actualizar `docs/adr/005-document-extraction-provider.md` de Propuesto
  a Aceptado con el proveedor elegido y umbral recomendado.
  - Evidencia: ADR 005 actualizado.
  - Dependencias: C.4.
  - Requisitos: R7.9.

DETENER tras completar Grupo C. Entregar informe de checkpoint.

## Grupo Z - Cierre (tras aprobación de los tres spikes)

- [ ] Z.1 Consolidar decisiones de los tres spikes y su impacto en las Specs
  siguientes. Marcar código de spike como descartable. Actualizar ADRs y
  Steering solo cuando la evidencia lo justifique. Crear informe final de la
  Spec con PASS/PARTIAL/FAIL por requisito. Proponer Spec 2.
  - Evidencia: nota de decisión en `/docs`, informe final.
  - Dependencias: A.7, B.5, C.5.
  - Requisitos: R1.3, R9.

## Paralelización

- Grupos A, B y C podrían técnicamente ejecutarse en paralelo (comparten solo
  la infra de lab), pero se ejecutan secuencialmente por checkpoints para
  control.
- Dentro del Grupo C, C.2 y C.3 corren en paralelo.
- El Grupo Z requiere el cierre de A, B y C.
