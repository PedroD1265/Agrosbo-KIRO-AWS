---
inclusion: fileMatch
fileMatchPattern:
  - "web/src/lib/sync/**"
  - "web/src/lib/db/**"
  - "api/src/idempotency.ts"
---

# AGROSBO - Offline-first

Responsabilidad: qué funciona sin conexión y cómo sincroniza. No repite reglas
de dominio ni de integridad. Refleja la implementación real en
`web/src/lib/sync` y `web/src/lib/db`.

## Operaciones soportadas offline (Implemented now)

Se encolan como mutaciones y se aplican al recuperar conexión:
- Tareas: crear, cambiar estado, actualizar, borrar.
- Riego: crear, marcar hecho, actualizar, borrar.
- Observaciones: crear, borrar.
- Inventario: crear, ajustar stock, actualizar, borrar.
- Cosecha: crear, actualizar, borrar.
- Campañas: crear, actualizar, borrar.
- Bloques / invernaderos: crear, actualizar, borrar.
- Aplicaciones agrícolas, apicultura (apiario/colmena/inspección/cosecha de
  miel), gastos, mano de obra, adjuntos, ajustes.

## Operaciones online-only o dependientes de servicio

- Login/logout, gestión de usuarios (requiere servidor).
- Clima (fetch a Open-Meteo; se cachea, pero el origen es online).
- Reportes CSV (se generan en servidor).
- Cualquier operación que dependa de PostgreSQL cuando el backend corre en
  `USE_MEM_STORAGE` NO está disponible en ese modo (adjuntos, finanzas,
  aplicaciones, apicultura, usuarios).

## Operaciones definidas pero SIN endpoint (latentes)

Existen mutaciones de geometría en el cliente (`block:geometry`,
`greenhouse:location`, `observation:location`, `block:import`) que apuntan a
endpoints **inexistentes** y **no** están cableadas en la UI. Ver
`docs/architecture/spatial-gap-register.md`. NO afirmar que la edición espacial
offline funciona.

## Cola local (Dexie / IndexedDB)

- Store `mutations` con: `clientId`, `domain`, `method`, `url`, `body`,
  `invalidateKeys`, `status` (`pending|syncing|failed`), `attempts`,
  `lastError`, `createdAt`, `updatedAt`.
- Store `idMap`: `tempId → realId`.

## Convención de identificadores

- `clientId` (idempotency key): generado por el cliente (`makeClientId`).
- IDs temporales optimistas hasta reconciliación con el ID real del servidor.
- Server IDs generados por el backend (`<prefijo>-<uuid8>`).

## Sincronización

- MUST procesar la cola respetando dependencias (creaciones antes que
  referencias) mediante reescritura temp→real (`idMap`).
- MUST ser idempotente por `X-Idempotency-Key = clientId` (reintento = no-op en
  servidor, vía `idempotency.ts`).
- MUST reconciliar IDs y actualizar referencias pendientes.
- MUST aplicar **backoff exponencial** (base 1.5 s, máx 30 s, hasta 6 intentos).
- MUST distinguir errores: 4xx de cliente → `failed` sin reintento (excepto 408
  y 429); 5xx/red → reintento; 401 → evento de sesión expirada.
- MUST NOT ocultar fallos: una operación fallida permanece visible y reintetable.
- MUST NOT procesar toda la cola en una sola transacción de servidor.

## Archivos (blobs)

- Estado actual: el archivo se envía **base64 dentro del JSON** de la mutación y
  el servidor lo guarda en disco local. Límite 10 MB, MIME validado.
- Estado objetivo (ADR 007): subir el archivo a **S3 con URL prefirmada**,
  separado de la sincronización de metadata, reintetable sin duplicar.
- MUST NOT crear archivos ni metadata duplicados ante reintentos.

## Actualización de la app / service worker

- SW `network-first` para navegación, `stale-while-revalidate` para assets,
  `network-only` para `/api/*` (las mutaciones offline las maneja la cola, no el
  SW). `skipWaiting` + `clients.claim` al activar.

## Límites (no exagerar)

- No hay Background Sync API; el reenvío depende de eventos `online` y
  `visibilitychange`.
- No hay resolución de conflictos multi-dispositivo (modelo single-device).
- No todos los módulos funcionan offline (ver secciones anteriores).
