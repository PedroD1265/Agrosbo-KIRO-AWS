import { useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from "react";
import { metersPerDegreeLng, METERS_PER_DEG_LAT } from "@shared/spatial";
import type { GeoJsonFeatureCollection } from "@shared/spatial";

export type SpatialMapProps = {
  features: GeoJsonFeatureCollection | undefined;
  height?: number | string;
  anchorLat?: number;
  anchorLng?: number;
  initialPaddingM?: number;
  interactive?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  highlightId?: string;
  onSelect?: (feature: { id: string; kind: string; name?: string }) => void;
  className?: string;
};

const TOCO = { lat: -17.4503, lng: -65.9712 };

const COLORS: Record<string, { fill: string; stroke: string }> = {
  block: { fill: "rgba(34,197,94,0.18)", stroke: "rgb(22,163,74)" },
  greenhouse: { fill: "rgba(59,130,246,0.22)", stroke: "rgb(37,99,235)" },
  "block-hl": { fill: "rgba(34,197,94,0.45)", stroke: "rgb(21,128,61)" },
  "greenhouse-hl": { fill: "rgba(59,130,246,0.5)", stroke: "rgb(29,78,216)" },
};

const OBS_COLOR: Record<string, string> = {
  note: "rgb(100,116,139)",
  incident: "rgb(234,88,12)",
  pest: "rgb(217,70,239)",
  disease: "rgb(220,38,38)",
};

type Pt = { x: number; y: number };

export function SpatialMap({
  features,
  height = 520,
  anchorLat = TOCO.lat,
  anchorLng = TOCO.lng,
  initialPaddingM = 250,
  interactive = true,
  showGrid = true,
  showLegend = true,
  highlightId,
  onSelect,
  className,
}: SpatialMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 520 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ kind: string; id: string; name?: string; x: number; y: number } | null>(null);

  // Observe size
  useMemo(() => {
    if (typeof ResizeObserver === "undefined") return;
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapRef.current]);

  const mxLng = metersPerDegreeLng(anchorLat);
  const mxLat = METERS_PER_DEG_LAT;

  // Compute world bounds in meters relative to anchor — derive from features if any, fallback to padding
  const worldBoundsM = useMemo(() => {
    let minX = -initialPaddingM, maxX = initialPaddingM, minY = -initialPaddingM, maxY = initialPaddingM;
    const fs = features?.features ?? [];
    let hasAny = false;
    for (const f of fs) {
      const g = f.geometry;
      if (g.type === "Polygon") {
        for (const [lng, lat] of g.coordinates[0] ?? []) {
          const X = (lng - anchorLng) * mxLng;
          const Y = (lat - anchorLat) * mxLat;
          if (!hasAny) { minX = maxX = X; minY = maxY = Y; hasAny = true; }
          else { if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y; }
        }
      } else if (g.type === "Point") {
        const [lng, lat] = g.coordinates;
        const X = (lng - anchorLng) * mxLng;
        const Y = (lat - anchorLat) * mxLat;
        if (!hasAny) { minX = maxX = X; minY = maxY = Y; hasAny = true; }
        else { if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y; }
      }
    }
    // pad
    const padM = 60;
    return { minX: minX - padM, maxX: maxX + padM, minY: minY - padM, maxY: maxY + padM };
  }, [features, anchorLat, anchorLng, mxLng, mxLat, initialPaddingM]);

  // Fit-to-screen scale (m → px), preserving aspect ratio
  const baseScale = useMemo(() => {
    const wM = worldBoundsM.maxX - worldBoundsM.minX;
    const hM = worldBoundsM.maxY - worldBoundsM.minY;
    if (wM <= 0 || hM <= 0 || size.w <= 0 || size.h <= 0) return 1;
    return Math.min(size.w / wM, size.h / hM);
  }, [worldBoundsM, size]);

  const scale = baseScale * zoom; // px per meter

  // Project [lng, lat] → SVG px
  const project = (lng: number, lat: number): Pt => {
    const X = (lng - anchorLng) * mxLng;
    const Y = (lat - anchorLat) * mxLat;
    // Center the world inside SVG
    const cx = size.w / 2 + pan.x;
    const cy = size.h / 2 + pan.y;
    // Use centroid of world bounds as origin
    const ox = (worldBoundsM.minX + worldBoundsM.maxX) / 2;
    const oy = (worldBoundsM.minY + worldBoundsM.maxY) / 2;
    return { x: cx + (X - ox) * scale, y: cy - (Y - oy) * scale };
  };

  const polygonPath = (coords: [number, number][]) =>
    coords
      .map((c, i) => {
        const p = project(c[0], c[1]);
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  // Build grid lines every 100m within world bounds (visible in current viewport)
  const gridLines = useMemo(() => {
    if (!showGrid) return [] as Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }>;
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }> = [];
    const step = 100; // meters
    const startX = Math.floor(worldBoundsM.minX / step) * step;
    const startY = Math.floor(worldBoundsM.minY / step) * step;
    for (let X = startX; X <= worldBoundsM.maxX; X += step) {
      const lng = anchorLng + X / mxLng;
      const a = project(lng, anchorLat + worldBoundsM.minY / mxLat);
      const b = project(lng, anchorLat + worldBoundsM.maxY / mxLat);
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major: X % 500 === 0 });
    }
    for (let Y = startY; Y <= worldBoundsM.maxY; Y += step) {
      const lat = anchorLat + Y / mxLat;
      const a = project(anchorLng + worldBoundsM.minX / mxLng, lat);
      const b = project(anchorLng + worldBoundsM.maxX / mxLng, lat);
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major: Y % 500 === 0 });
    }
    return lines;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldBoundsM, scale, pan, size, showGrid]);

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onPointerUp = () => { dragRef.current = null; };
  const onWheel = (e: RWheelEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom((z) => Math.min(8, Math.max(0.5, z * factor)));
  };

  const fs = features?.features ?? [];
  const blocks = fs.filter((f) => (f.properties as any)?.kind === "block");
  const greenhouses = fs.filter((f) => (f.properties as any)?.kind === "greenhouse");
  const points = fs.filter((f) => f.geometry.type === "Point");

  // anchor projection (Toco marker)
  const anchorPx = project(anchorLng, anchorLat);

  // scale bar (100m at current zoom)
  const scaleBarM = (() => {
    const targetPx = 80;
    const m = targetPx / scale;
    const niceVals = [10, 20, 50, 100, 200, 500, 1000, 2000];
    return niceVals.find((v) => v >= m) ?? 2000;
  })();

  return (
    <div
      ref={wrapRef}
      className={"relative w-full overflow-hidden rounded-md border bg-muted/20 " + (className ?? "")}
      style={{ height }}
      data-testid="spatial-map-root"
    >
      <svg
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="block touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        style={{ cursor: dragRef.current ? "grabbing" : interactive ? "grab" : "default" }}
        data-testid="spatial-map-svg"
      >
        {/* Grid */}
        {showGrid && (
          <g>
            {gridLines.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke={l.major ? "hsl(var(--border))" : "hsl(var(--border))"}
                strokeOpacity={l.major ? 0.7 : 0.3}
                strokeWidth={l.major ? 0.8 : 0.5}
              />
            ))}
          </g>
        )}

        {/* Blocks */}
        <g>
          {blocks.map((f) => {
            const props = f.properties as any;
            const id = props.id as string;
            const hl = id === highlightId;
            const c = COLORS[hl ? "block-hl" : "block"];
            const ring = (f.geometry as any).coordinates[0] as [number, number][];
            const path = polygonPath(ring);
            return (
              <path
                key={id}
                d={path}
                fill={c.fill}
                stroke={c.stroke}
                strokeWidth={hl ? 2 : 1.2}
                onClick={() => onSelect?.({ id, kind: "block", name: props.name })}
                onPointerEnter={(e) => setHover({ kind: "block", id, name: props.name, x: (e as any).clientX, y: (e as any).clientY })}
                onPointerLeave={() => setHover(null)}
                style={{ cursor: onSelect ? "pointer" : "default" }}
                data-testid={`map-block-${id}`}
              />
            );
          })}
        </g>

        {/* Greenhouses */}
        <g>
          {greenhouses.map((f) => {
            const props = f.properties as any;
            const id = props.id as string;
            const hl = id === highlightId;
            const c = COLORS[hl ? "greenhouse-hl" : "greenhouse"];
            const ring = (f.geometry as any).coordinates[0] as [number, number][];
            const path = polygonPath(ring);
            return (
              <path
                key={id}
                d={path}
                fill={c.fill}
                stroke={c.stroke}
                strokeWidth={hl ? 2 : 1.2}
                onClick={() => onSelect?.({ id, kind: "greenhouse", name: props.name })}
                onPointerEnter={(e) => setHover({ kind: "greenhouse", id, name: props.name, x: (e as any).clientX, y: (e as any).clientY })}
                onPointerLeave={() => setHover(null)}
                style={{ cursor: onSelect ? "pointer" : "default" }}
                data-testid={`map-greenhouse-${id}`}
              />
            );
          })}
        </g>

        {/* Block name labels */}
        <g pointerEvents="none">
          {blocks.map((f) => {
            const props = f.properties as any;
            const id = props.id as string;
            const ring = (f.geometry as any).coordinates[0] as [number, number][];
            // centroid
            let sx = 0, sy = 0; const n = ring.length - 1;
            for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
            const p = project(sx / n, sy / n);
            return (
              <text key={id} x={p.x} y={p.y} textAnchor="middle" fontSize={11}
                    fill="hsl(var(--foreground))" style={{ paintOrder: "stroke", stroke: "hsl(var(--background))", strokeWidth: 3 }}>
                {props.name}
              </text>
            );
          })}
        </g>

        {/* Points (observations + greenhouse-points) */}
        <g>
          {points.map((f) => {
            const props = f.properties as any;
            const id = props.id as string;
            const [lng, lat] = (f.geometry as any).coordinates as [number, number];
            const p = project(lng, lat);
            const isObs = props.kind === "observation";
            const fill = isObs ? OBS_COLOR[props.obsType] ?? "rgb(100,116,139)" : "rgb(37,99,235)";
            return (
              <g key={id} transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}>
                <circle
                  r={5.5}
                  fill={fill}
                  stroke="white"
                  strokeWidth={1.5}
                  onClick={() => onSelect?.({ id, kind: props.kind, name: props.scopeName ?? props.name })}
                  onPointerEnter={(e) => setHover({ kind: props.kind, id, name: props.scopeName ?? props.name, x: (e as any).clientX, y: (e as any).clientY })}
                  onPointerLeave={() => setHover(null)}
                  style={{ cursor: onSelect ? "pointer" : "default" }}
                  data-testid={`map-point-${id}`}
                />
              </g>
            );
          })}
        </g>

        {/* Anchor (Toco) */}
        <g transform={`translate(${anchorPx.x.toFixed(1)},${anchorPx.y.toFixed(1)})`} pointerEvents="none">
          <circle r={4} fill="rgb(239,68,68)" />
          <text x={8} y={4} fontSize={10} fill="hsl(var(--foreground))" style={{ paintOrder: "stroke", stroke: "hsl(var(--background))", strokeWidth: 3 }}>
            Toco
          </text>
        </g>

        {/* Scale bar */}
        <g transform={`translate(16, ${size.h - 22})`} pointerEvents="none">
          <line x1={0} y1={0} x2={scaleBarM * scale} y2={0} stroke="hsl(var(--foreground))" strokeWidth={2} />
          <line x1={0} y1={-4} x2={0} y2={4} stroke="hsl(var(--foreground))" strokeWidth={2} />
          <line x1={scaleBarM * scale} y1={-4} x2={scaleBarM * scale} y2={4} stroke="hsl(var(--foreground))" strokeWidth={2} />
          <text x={(scaleBarM * scale) / 2} y={-6} textAnchor="middle" fontSize={10} fill="hsl(var(--foreground))">
            {scaleBarM >= 1000 ? `${(scaleBarM / 1000).toFixed(scaleBarM % 1000 ? 1 : 0)} km` : `${scaleBarM} m`}
          </text>
        </g>
      </svg>

      {/* Zoom controls */}
      {interactive && (
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(8, z * 1.25))}
            className="h-7 w-7 rounded-md border bg-background text-sm font-medium shadow-sm hover-elevate active-elevate-2"
            data-testid="button-map-zoom-in"
          >+</button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))}
            className="h-7 w-7 rounded-md border bg-background text-sm font-medium shadow-sm hover-elevate active-elevate-2"
            data-testid="button-map-zoom-out"
          >−</button>
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="h-7 w-7 rounded-md border bg-background text-[10px] font-medium shadow-sm hover-elevate active-elevate-2"
            data-testid="button-map-reset"
            title="Centrar"
          >⌂</button>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-2 right-2 rounded-md border bg-background/95 px-2 py-1.5 text-[10px] shadow-sm" data-testid="map-legend">
          <div className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: COLORS.block.fill, borderColor: COLORS.block.stroke }} />Bloques</div>
          <div className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: COLORS.greenhouse.fill, borderColor: COLORS.greenhouse.stroke }} />Invernaderos</div>
          <div className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: OBS_COLOR.incident }} />Observaciones</div>
        </div>
      )}

      {/* Hover tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
          style={{ left: 8, top: 8 }}
          data-testid="map-hover-tooltip"
        >
          <span className="font-medium">{hover.name ?? hover.id}</span>
          <span className="ml-1 text-muted-foreground">· {hover.kind}</span>
        </div>
      )}
    </div>
  );
}
