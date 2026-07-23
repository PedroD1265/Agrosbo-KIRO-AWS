# Spike A — Offline Sync Report

## Objetivo

Validar que el protocolo de sincronización offline cumple:
- Ordenamiento topológico de dependencias.
- Idempotencia por client_op_id.
- Reconciliación temp_entity_id → server_entity_id.
- Aislamiento de fallos entre operaciones independientes.
- Detección de posibles duplicados sin fusión automática.
- Separación de la subida de archivos respecto a la transacción PostgreSQL.

## Entorno

- OS: Windows 11
- PostgreSQL: 15-alpine via Docker (port 54320)
- Node.js: >=20
- Test runner: Vitest 2.1.9
- pg (node-postgres): 8.22.0
- Datos: sintéticos, sin PII real

## Arquitectura del spike

```
spikes/spike-a-offline-sync/
├── src/
│   ├── domain/           # Tipos, topological sort, duplicate detection (puras)
│   ├── adapters/         # Repository interface + PgLocal adapter + Storage interface + FakeLocal
│   ├── service/          # SyncService (orquesta: sort → idempotency → execute → record)
│   └── client/           # OfflineQueue (simula IndexedDB)
├── migrations/           # Schema desechable (001-spike-a-schema.sql)
├── docker-compose.yml    # PostgreSQL 15-alpine, trust auth, port 54320
└── sync.test.ts          # 13 tests de integración
```

Separación de capas:
- **domain/**: reglas puras sin dependencias de infraestructura.
- **adapters/**: `SyncRepository` (interface) + `PgLocalRepository` (implementación local).
  Un futuro adaptador Data API implementaría la misma interfaz sin tocar dominio.
- **adapters/storage.ts**: `StorageAdapter` (interface) + `FakeLocalStorage`.
  Un futuro adaptador S3 implementaría la misma interfaz.
- **service/**: orquesta el flujo completo usando las interfaces.

## Comandos ejecutados

```bash
# Levantar base de datos
docker compose up -d --wait

# Correr tests
npx vitest run --reporter=verbose

# Destruir
docker compose down -v
```

## Casos probados y resultados

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Orden topológico de dependencias | PASS |
| 2 | Idempotencia por client_op_id (reintento = no-op) | PASS |
| 3 | temp_id reconciliado a server UUID | PASS |
| 4 | Dependencias reemplazadas por IDs reales en DB | PASS |
| 5 | Reintento completo (P→L→H) sin duplicados | PASS |
| 6 | Fallo independiente aislado — no revierte otras confirmadas | PASS |
| 7 | Operación dependiente bloqueada cuando padre falla | PASS |
| 8 | Posible duplicado marcado (6 campos coinciden) | PASS |
| 9 | Ninguna fusión automática — original intacto | PASS |
| 10 | Archivo subido fuera de la transacción, metadata guardada después | PASS |
| 11 | Metadata NO creada si la subida falla | PASS |
| 12 | Transacción revertida cuando operación inseparable falla | PASS |
| 13 | Datos sintéticos, sin PII | PASS |

**Resultado global: 13/13 PASS**

## Evidencia

```
 ✓ src/sync.test.ts (13)
 Test Files  1 passed (1)
      Tests  13 passed (13)
   Duration  ~2s
```

## Errores encontrados y corregidos durante el spike

1. **Puerto 5433 ocupado por PostgreSQL local**: la máquina tiene un PostgreSQL
   instalado en el puerto 5433. Solución: cambiar el Docker compose a port
   54320.

2. **temp_entity_id como UUID en el schema**: los IDs temporales del cliente
   pueden ser strings arbitrarios ("parcel-temp-1"). Solución: cambiar la
   columna de UUID a TEXT.

3. **Detección de duplicados después del INSERT**: al verificar duplicados
   después de crear el harvest, la consulta encontraba el harvest recién
   creado en la misma transacción como su propio duplicado. Solución: mover
   la verificación de duplicados ANTES del INSERT.

4. **Autenticación Docker postgres**: el pg npm v8+ con pg 15 tiene
   incompatibilidades con md5/scram-sha-256 en Windows+Docker. Solución: usar
   `POSTGRES_HOST_AUTH_METHOD=trust` sin `POSTGRES_PASSWORD` (aceptable para
   lab local desechable).

## Mediciones

| Métrica | Valor |
|---------|-------|
| Tiempo total de los 13 tests | ~1.2s (queries) |
| Tiempo de setup Docker | ~3s (healthy) |
| Latencia por operación individual | <10ms |
| Transacciones por operación | 1 (corta) |

## Limitaciones

- No se probó contra RDS Data API real (pendiente para prueba futura).
- No se probó IndexedDB real en navegador (se simuló con clase OfflineQueue).
- No se probó concurrencia (dos dispositivos sincronizando en paralelo).
- El storage adapter es un fake; no se probó S3 real.
- La detección de duplicados usa igualdad exacta de 6 campos; no se probó con
  datos reales de campo (la regla es provisional).

## Código descartable

- `spikes/spike-a-offline-sync/` completo es descartable.
- El schema SQL NO debe usarse como migración de producción.
- `docker-compose.yml` es solo para lab local.
- `pg_hba.conf` puede eliminarse (no se usa ya).

## Código potencialmente reutilizable

Los siguientes patrones se reimplementarán en la Spec de producción:

- **Interface `SyncRepository`**: el contrato es correcto y puede usarse como
  base para el adaptador Data API.
- **Interface `StorageAdapter`**: correcto como abstracción para S3.
- **`sortByDependencies` (topological sort)**: lógica pura, reutilizable
  directamente.
- **`buildHarvestDuplicateKey` / `duplicateKeyMatches`**: lógica pura.
- **Protocolo del SyncService**: el flujo (sort → idempotency → execute →
  record) está validado y debe replicarse.
- **Estructura de la operación local (client_op_id, temp_entity_id,
  dependency_op_ids, etc.)**: validada.

## Cambios recomendados para la arquitectura

1. **`sync_operation.temp_entity_id` debe ser TEXT, no UUID** — los clientes
   generan IDs temporales que pueden no ser UUIDs válidos.

2. **La detección de duplicados debe ocurrir ANTES del INSERT** — verificar
   existencia previa, no postergar a post-INSERT.

3. **Data API requiere prueba separada** — el patrón `beginTransaction` /
   `commit` / `rollback` funciona con pg Pool; Data API tiene un API distinta
   (transactionId). El adaptador deberá mapear estos conceptos.

4. **No-password auth en Docker para lab es aceptable** — pero la producción
   usará Cognito + IAM; este tema no afecta el diseño del protocolo.

## Decisión

**El protocolo de sincronización offline es VIABLE.**

- La idempotencia por client_op_id + ON CONFLICT DO NOTHING funciona.
- El orden topológico por dependency_op_ids funciona.
- Una transacción corta por operación aísla fallos correctamente.
- La reconciliación de IDs se propaga a operaciones dependientes.
- La detección de duplicados marca sin modificar.
- La separación archivo/transacción es clara.

**ACEPTADO** — proceder con la implementación de producción en la Spec
correspondiente.
