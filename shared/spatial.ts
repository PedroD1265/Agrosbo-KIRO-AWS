import { z } from 'zod';

/* ========================================================================
 * GeoJSON contracts (subset used by AgrosBO spatial layer)
 * Always WGS84 (lon, lat). Polygons assumed simple, no holes by default.
 * ====================================================================== */

export const lngLatSchema = z
  .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
  .describe('[lng, lat] WGS84');

export const geoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: lngLatSchema,
});
export type GeoJsonPoint = z.infer<typeof geoJsonPointSchema>;

const linearRingSchema = z
  .array(lngLatSchema)
  .min(4, 'Un anillo lineal necesita al menos 4 vértices (cerrado)');

export const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(linearRingSchema).min(1),
});
export type GeoJsonPolygon = z.infer<typeof geoJsonPolygonSchema>;

export const geoJsonGeometrySchema = z.union([geoJsonPointSchema, geoJsonPolygonSchema]);
export type GeoJsonGeometry = z.infer<typeof geoJsonGeometrySchema>;

export const geoJsonFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: geoJsonGeometrySchema,
  properties: z.record(z.unknown()).nullable().optional(),
  id: z.union([z.string(), z.number()]).optional(),
});
export type GeoJsonFeature = z.infer<typeof geoJsonFeatureSchema>;

export const geoJsonFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(geoJsonFeatureSchema),
});
export type GeoJsonFeatureCollection = z.infer<typeof geoJsonFeatureCollectionSchema>;

/* ========================================================================
 * Patch contracts (PATCH /spatial endpoints)
 * ====================================================================== */

export const blockGeometryPatchSchema = z
  .object({
    centroidLat: z.number().min(-90).max(90).optional(),
    centroidLng: z.number().min(-180).max(180).optional(),
    boundary: geoJsonPolygonSchema.nullable().optional(),
  })
  .refine(
    (v) => (v.centroidLat !== undefined && v.centroidLng !== undefined) || v.boundary !== undefined,
    'Debes enviar centroide o boundary',
  );
export type BlockGeometryPatch = z.infer<typeof blockGeometryPatchSchema>;

export const greenhouseLocationPatchSchema = z
  .object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    footprint: geoJsonPolygonSchema.nullable().optional(),
  })
  .refine(
    (v) => (v.lat !== undefined && v.lng !== undefined) || v.footprint !== undefined,
    'Debes enviar punto o footprint',
  );
export type GreenhouseLocationPatch = z.infer<typeof greenhouseLocationPatchSchema>;

export const observationLocationPatchSchema = z.object({
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});
export type ObservationLocationPatch = z.infer<typeof observationLocationPatchSchema>;

/* ========================================================================
 * Geo helpers (pure, isomorphic — used by server seed and client UI).
 * Equirectangular meters; sufficient for plot-scale agricultural blocks.
 * ====================================================================== */

const EARTH_R_M = 6_378_137;
const DEG2RAD = Math.PI / 180;

/** Meters per degree longitude at given latitude (equirectangular). */
export function metersPerDegreeLng(lat: number): number {
  return (Math.PI / 180) * EARTH_R_M * Math.cos(lat * DEG2RAD);
}
/** Meters per degree latitude (constant). */
export const METERS_PER_DEG_LAT = (Math.PI / 180) * EARTH_R_M;

/** Build a square boundary polygon centered on (lat,lng) with given area in hectares. */
export function squareBoundaryFromCenter(lat: number, lng: number, areaHa: number): GeoJsonPolygon {
  const sideM = Math.sqrt(Math.max(areaHa, 0.0001) * 10_000); // ha → m²
  const half = sideM / 2;
  const dLat = half / METERS_PER_DEG_LAT;
  const dLng = half / metersPerDegreeLng(lat);
  const ring: [number, number][] = [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
  return { type: 'Polygon', coordinates: [ring] };
}

/** Build a rectangle footprint centered on (lat,lng) with given area in m². */
export function rectFootprintFromCenter(
  lat: number,
  lng: number,
  areaM2: number,
  ratio = 1.5,
): GeoJsonPolygon {
  const w = Math.sqrt(Math.max(areaM2, 1) / ratio);
  const h = w * ratio;
  const dLat = h / 2 / METERS_PER_DEG_LAT;
  const dLng = w / 2 / metersPerDegreeLng(lat);
  const ring: [number, number][] = [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
  return { type: 'Polygon', coordinates: [ring] };
}

/** Centroid (average of unique vertices) of a polygon. */
export function polygonCentroid(p: GeoJsonPolygon): { lat: number; lng: number } {
  const ring = p.coordinates[0] ?? [];
  const verts = ring.length > 1 ? ring.slice(0, -1) : ring;
  if (verts.length === 0) return { lat: 0, lng: 0 };
  let sx = 0;
  let sy = 0;
  for (const [x, y] of verts) {
    sx += x;
    sy += y;
  }
  return { lng: sx / verts.length, lat: sy / verts.length };
}

/** Planar shoelace area in m² using equirectangular projection at polygon centroid. */
export function polygonAreaM2(p: GeoJsonPolygon): number {
  const ring = p.coordinates[0] ?? [];
  if (ring.length < 4) return 0;
  const c = polygonCentroid(p);
  const mxLng = metersPerDegreeLng(c.lat);
  const mxLat = METERS_PER_DEG_LAT;
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const X1 = (x1 - c.lng) * mxLng;
    const Y1 = (y1 - c.lat) * mxLat;
    const X2 = (x2 - c.lng) * mxLng;
    const Y2 = (y2 - c.lat) * mxLat;
    s += X1 * Y2 - X2 * Y1;
  }
  return Math.abs(s) / 2;
}

/** Bounding box of a list of [lng,lat] tuples. */
export function bboxOf(points: Array<[number, number]>): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} | null {
  if (points.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [x, y] of points) {
    if (x < minLng) minLng = x;
    if (x > maxLng) maxLng = x;
    if (y < minLat) minLat = y;
    if (y > maxLat) maxLat = y;
  }
  return { minLng, minLat, maxLng, maxLat };
}
