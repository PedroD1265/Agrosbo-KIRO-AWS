# AGROSBO - Registro del gap espacial

Registra el estado real de la capa espacial. NO se implementan rutas en la fase
de estabilización; queda para la Spec `spatial-farms-blocks-and-map` (#4).

## Rutas consumidas por el cliente

| Ruta | Origen (cliente) | ¿Existe en API? |
|---|---|---|
| `GET /api/spatial/features` | `web/src/hooks/data/index.ts::useSpatialFeatures` (usada por `pages/Map.tsx`) | **No** |
| `PATCH /api/blocks/:id/geometry` | `web/src/hooks/data/mutations.ts::queueUpdateBlockGeometry` | **No** |
| `PATCH /api/greenhouses/:id/location` | `queueUpdateGreenhouseLocation` | **No** |
| `PATCH /api/observations/:id/location` | `queueUpdateObservationLocation` | **No** |
| `POST /api/spatial/blocks/import` | `queueImportBlockBoundaries` | **No** |

## Métodos presentes en DbStorage (sin ruta)

`api/src/dbStorage.ts` implementa: `updateBlockGeometry`, `importBlockBoundaries`,
`updateGreenhouseLocation`, `updateObservationLocation` (con centroide/área
derivados de `shared/spatial.ts`). **No están expuestos** en `api/src/routes.ts`.

## Ausencias

- **IStorage**: no declara los métodos espaciales → no forman parte del contrato.
- **MemStorage**: no los implementa → no disponibles en modo memoria.

## Helpers

- **Activos**: `shared/spatial.ts` (GeoJSON Zod + `polygonCentroid`,
  `polygonAreaM2`, `squareBoundaryFromCenter`, etc.), usados por `SpatialMap` y
  por los métodos de `DbStorage`.
- **Latentes**: las mutaciones cliente de geometría (definidas, no invocadas por
  ninguna `.tsx`).

## Impacto en Map

`pages/Map.tsx` usa `useSpatialFeatures()`; como la ruta no existe, la
`FeatureCollection` queda vacía y el mapa se renderiza **sin polígonos
agregados**. Las listas de bloques/invernaderos siguen funcionando (usan sus
propias queries), pero el lienzo espacial no muestra geometrías.

## Decisión recomendada (para la Spec #4)

1. Implementar `GET /api/spatial/features` agregando bloques (boundary),
   invernaderos (footprint/lat-lng) y observaciones (lat/lng) a una
   `FeatureCollection` con `properties.kind`.
2. Exponer los PATCH/POST de geometría delegando en los métodos existentes de
   `DbStorage`; añadirlos a `IStorage` y a `MemStorage`.
3. Cablear (o retirar) las mutaciones de geometría del cliente según UX.

## Tests requeridos (para la Spec #4)

- Serialización correcta de la `FeatureCollection` (kind por entidad).
- Recalculo de centroide/área al actualizar geometría.
- Idempotencia de import de límites.
- Paridad memoria/PostgreSQL de los métodos espaciales.

## ¿PostGIS?

**No para el MVP.** No hay consultas geoespaciales en SQL (intersección,
contains, distancia); el cálculo es JS puro a escala de parcela. JSONB + GeoJSON
es suficiente. PostGIS solo se justificaría con consultas geoespaciales
server-side o grandes volúmenes.
