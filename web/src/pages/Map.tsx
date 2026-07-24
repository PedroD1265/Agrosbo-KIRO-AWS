import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { MapSkeleton } from "@/shared/ui/MapSkeleton";
import { SpatialMap } from "@/components/map/SpatialMap";
import { useBlocks, useGreenhouses, useObservations, useSpatialFeatures } from "@/hooks/data";
import type { GeoJsonFeatureCollection } from "@shared/spatial";
import type { Block, Greenhouse, Observation } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Layers,
  MapPin,
  Search,
  Square,
  Warehouse,
  Eye,
  EyeOff,
  ExternalLink,
  Crosshair,
  X,
  Map as MapIcon,
  AlertCircle,
} from "lucide-react";

type LayerKey = "blocks" | "greenhouses" | "observations";
type Selection = { id: string; kind: string; name?: string } | null;

const LAYER_META: Record<LayerKey, { label: string; icon: typeof Square; swatch: string }> = {
  blocks: { label: "Bloques", icon: Square, swatch: "bg-status-ok/30 border-status-ok" },
  greenhouses: { label: "Invernaderos", icon: Warehouse, swatch: "bg-primary/25 border-primary" },
  observations: { label: "Observaciones", icon: MapPin, swatch: "bg-status-warn/40 border-status-warn" },
};

/* -------------------------------------------------------------- */
/* Detail content shared by drawer (mobile) and side panel (desktop) */
/* -------------------------------------------------------------- */

function SelectionDetail({
  selected,
  block,
  greenhouse,
  observation,
  onOpen,
  onClear,
  onFocus,
}: {
  selected: NonNullable<Selection>;
  block?: Block;
  greenhouse?: Greenhouse;
  observation?: Observation;
  onOpen: () => void;
  onClear: () => void;
  onFocus: () => void;
}) {
  const isBlock = selected.kind === "block";
  const isGh = selected.kind === "greenhouse" || selected.kind === "greenhouse-point";
  const isObs = selected.kind === "observation";

  const Icon = isBlock ? Square : isGh ? Warehouse : MapPin;
  const tone = isBlock ? "bg-status-ok-soft text-status-ok" : isGh ? "bg-primary-soft text-primary" : "bg-status-warn-soft text-status-warn";
  const kindLabel = isBlock ? "Bloque" : isGh ? "Invernadero" : "Observación";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-border/60 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{kindLabel}</p>
          <p className="mt-0.5 text-base font-semibold leading-tight truncate">
            {selected.name ?? block?.name ?? greenhouse?.name ?? "Sin nombre"}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground truncate">{selected.id}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClear} data-testid="button-clear-selection">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {block && (
          <>
            <div className="grid grid-cols-2 gap-y-2.5 text-sm">
              <span className="text-muted-foreground">Finca</span>
              <span className="font-medium truncate">{block.farm}</span>
              <span className="text-muted-foreground">Cultivo</span>
              <span className="font-medium truncate">{block.crop}</span>
              <span className="text-muted-foreground">Etapa</span>
              <span className="font-medium">{block.stage}</span>
              <span className="text-muted-foreground">Área</span>
              <span className="font-medium tabular">{block.areaHa.toFixed(2)} ha</span>
              <span className="text-muted-foreground">Estado</span>
              <StatusBadge status={block.status} />
            </div>
            {!block.boundary && (
              <div className="rounded-md border border-status-warn/30 bg-status-warn-soft px-3 py-2 text-xs text-status-warn">
                <AlertCircle className="mr-1 inline h-3 w-3" />
                Sin polígono dibujado todavía.
              </div>
            )}
          </>
        )}

        {greenhouse && (
          <div className="grid grid-cols-2 gap-y-2.5 text-sm">
            <span className="text-muted-foreground">Cultivo</span>
            <span className="font-medium truncate">{greenhouse.crop}</span>
            <span className="text-muted-foreground">Etapa</span>
            <span className="font-medium">{greenhouse.stage}</span>
            <span className="text-muted-foreground">Área</span>
            <span className="font-medium tabular">{greenhouse.areaM2} m²</span>
            <span className="text-muted-foreground">Estado</span>
            <StatusBadge status={greenhouse.status} />
          </div>
        )}

        {observation && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-y-2.5 text-sm">
              <span className="text-muted-foreground">Tipo</span>
              <span className="font-medium capitalize">{(observation as any).type ?? "—"}</span>
              <span className="text-muted-foreground">Severidad</span>
              <span className="font-medium">{(observation as any).severity ?? "—"}</span>
            </div>
            {(observation as any).notes && (
              <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-foreground/80">
                {(observation as any).notes}
              </p>
            )}
          </div>
        )}

        {!block && !greenhouse && !observation && (
          <p className="text-xs text-muted-foreground">Sin datos adicionales para esta entidad.</p>
        )}
      </div>

      <div className="flex gap-2 border-t border-border/60 p-3">
        <Button variant="outline" size="sm" className="flex-1" onClick={onFocus} data-testid="button-focus-selected">
          <Crosshair className="h-3.5 w-3.5" /> Centrar
        </Button>
        <Button size="sm" className="flex-1" onClick={onOpen} data-testid="button-open-selected">
          <ExternalLink className="h-3.5 w-3.5" /> Abrir detalle
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Entity list panel (left)                                        */
/* -------------------------------------------------------------- */

function EntityList({
  blocks,
  greenhouses,
  selectedId,
  onSelect,
  query,
  onQuery,
  layers,
}: {
  blocks: Block[];
  greenhouses: Greenhouse[];
  selectedId?: string;
  onSelect: (sel: NonNullable<Selection>) => void;
  query: string;
  onQuery: (s: string) => void;
  layers: Record<LayerKey, boolean>;
}) {
  const q = query.trim().toLowerCase();
  const filteredBlocks = blocks.filter((b) => !q || b.name.toLowerCase().includes(q) || b.farm.toLowerCase().includes(q));
  const filteredGh = greenhouses.filter((g) => !q || g.name.toLowerCase().includes(q) || g.crop.toLowerCase().includes(q));

  const showBlocks = layers.blocks;
  const showGh = layers.greenhouses;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar bloque o invernadero…"
            className="pl-8 h-9 text-sm"
            data-testid="input-map-search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {showBlocks && (
          <div>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-background/95 px-3 py-2 backdrop-blur">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Square className="h-3 w-3" /> Bloques
              </p>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
                {filteredBlocks.length}
              </span>
            </div>
            {filteredBlocks.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">Sin resultados</p>
            ) : (
              <ul>
                {filteredBlocks.map((b) => {
                  const isSel = b.id === selectedId;
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => onSelect({ id: b.id, kind: "block", name: b.name })}
                        data-testid={`list-block-${b.id}`}
                        className={cn(
                          "flex w-full items-start gap-2 border-b border-border/30 px-3 py-2.5 text-left transition-colors",
                          isSel ? "bg-primary-soft" : "hover:bg-muted/40",
                        )}
                      >
                        <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-sm border", LAYER_META.blocks.swatch)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight truncate">{b.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                            {b.farm} · {b.areaHa.toFixed(1)} ha · {b.crop}
                          </p>
                        </div>
                        <StatusBadge status={b.status} dot={false} className="text-[9px] px-1.5 py-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {showGh && (
          <div>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-background/95 px-3 py-2 backdrop-blur">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Warehouse className="h-3 w-3" /> Invernaderos
              </p>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
                {filteredGh.length}
              </span>
            </div>
            {filteredGh.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">Sin resultados</p>
            ) : (
              <ul>
                {filteredGh.map((g) => {
                  const isSel = g.id === selectedId;
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => onSelect({ id: g.id, kind: "greenhouse", name: g.name })}
                        data-testid={`list-greenhouse-${g.id}`}
                        className={cn(
                          "flex w-full items-start gap-2 border-b border-border/30 px-3 py-2.5 text-left transition-colors",
                          isSel ? "bg-primary-soft" : "hover:bg-muted/40",
                        )}
                      >
                        <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-sm border", LAYER_META.greenhouses.swatch)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight truncate">{g.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                            {g.crop} · {g.areaM2} m²
                          </p>
                        </div>
                        <StatusBadge status={g.status} dot={false} className="text-[9px] px-1.5 py-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {!showBlocks && !showGh && (
          <div className="p-6">
            <EmptyState icon={EyeOff} title="Capas ocultas" description="Activa al menos una capa para ver entidades." />
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Main page                                                       */
/* -------------------------------------------------------------- */

export default function MapPage() {
  const navigate = useNavigate();
  const { data: features, isLoading } = useSpatialFeatures();
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();
  const { data: observations = [] } = useObservations();

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    blocks: true,
    greenhouses: true,
    observations: true,
  });
  const [selected, setSelected] = useState<Selection>(null);
  const [query, setQuery] = useState("");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  const filteredFC: GeoJsonFeatureCollection | undefined = useMemo(() => {
    if (!features) return undefined;
    return {
      type: "FeatureCollection",
      features: features.features.filter((f) => {
        const kind = (f.properties as { kind?: string } | null)?.kind;
        if (kind === "block") return layers.blocks;
        if (kind === "greenhouse" || kind === "greenhouse-point") return layers.greenhouses;
        if (kind === "observation") return layers.observations;
        return true;
      }),
    };
  }, [features, layers]);

  const counts = {
    blocksMapped: blocks.filter((b) => b.boundary).length,
    blocksTotal: blocks.length,
    ghMapped: greenhouses.filter((g) => g.footprint || (g.lat && g.lng)).length,
    ghTotal: greenhouses.length,
    obsLocated: observations.filter((o) => o.lat != null && o.lng != null).length,
    obsTotal: observations.length,
  };

  const blockCoverage = counts.blocksTotal > 0 ? Math.round((counts.blocksMapped / counts.blocksTotal) * 100) : 0;
  const ghCoverage = counts.ghTotal > 0 ? Math.round((counts.ghMapped / counts.ghTotal) * 100) : 0;
  const obsCoverage = counts.obsTotal > 0 ? Math.round((counts.obsLocated / counts.obsTotal) * 100) : 0;

  const onSelect = (f: { id: string; kind: string; name?: string }) => {
    setSelected(f);
    setMobileSheetOpen(true);
  };

  const openSelected = () => {
    if (!selected) return;
    if (selected.kind === "block") navigate(`/blocks/${selected.id}`);
    else if (selected.kind === "greenhouse" || selected.kind === "greenhouse-point") navigate(`/greenhouses/${selected.id}`);
    else if (selected.kind === "observation") navigate(`/observations`);
  };

  const focusSelected = () => setFocusKey((k) => k + 1);

  const selectedBlock = selected?.kind === "block" ? blocks.find((b) => b.id === selected.id) : undefined;
  const selectedGh = selected && (selected.kind === "greenhouse" || selected.kind === "greenhouse-point")
    ? greenhouses.find((g) => g.id === selected.id)
    : undefined;
  const selectedObs = selected?.kind === "observation"
    ? observations.find((o) => o.id === selected.id)
    : undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operación · Capa espacial"
        title="Mapa"
        subtitle="Toco, Cochabamba · vista operativa de bloques, invernaderos y observaciones"
        meta={
          <>
            <Badge variant="outline" className="gap-1.5 text-[11px]" data-testid="badge-blocks-coverage">
              <Square className="h-3 w-3 text-status-ok" />
              {counts.blocksMapped}/{counts.blocksTotal} bloques · {blockCoverage}%
            </Badge>
            <Badge variant="outline" className="gap-1.5 text-[11px]" data-testid="badge-greenhouses-coverage">
              <Warehouse className="h-3 w-3 text-primary" />
              {counts.ghMapped}/{counts.ghTotal} invernaderos · {ghCoverage}%
            </Badge>
            <Badge variant="outline" className="gap-1.5 text-[11px]" data-testid="badge-observations-coverage">
              <MapPin className="h-3 w-3 text-status-warn" />
              {counts.obsLocated}/{counts.obsTotal} obs · {obsCoverage}%
            </Badge>
          </>
        }
        actions={
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background p-1">
            <Layers className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
            {(Object.keys(LAYER_META) as LayerKey[]).map((k) => {
              const meta = LAYER_META[k];
              const Icon = meta.icon;
              const active = layers[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLayers((s) => ({ ...s, [k]: !s[k] }))}
                  data-testid={`button-toggle-layer-${k}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  title={meta.label}
                >
                  {active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{meta.label}</span>
                </button>
              );
            })}
          </div>
        }
      />

      {/* Desktop workbench: list | map | detail */}
      <div className="hidden lg:grid lg:gap-3" style={{ gridTemplateColumns: selected ? "280px 1fr 320px" : "280px 1fr" }}>
        <Card className="overflow-hidden border-border/60 shadow-card" style={{ height: "calc(100vh - 220px)", minHeight: 520 }}>
          <EntityList
            blocks={blocks}
            greenhouses={greenhouses}
            selectedId={selected?.id}
            onSelect={onSelect}
            query={query}
            onQuery={setQuery}
            layers={layers}
          />
        </Card>

        <Card className="overflow-hidden border-border/60 p-0 shadow-card" style={{ height: "calc(100vh - 220px)", minHeight: 520 }}>
          {isLoading ? (
            <MapSkeleton height="100%" />
          ) : (
            <SpatialMap
              key={focusKey}
              features={filteredFC}
              height="100%"
              highlightId={selected?.id}
              onSelect={onSelect}
            />
          )}
        </Card>

        {selected && (
          <Card className="overflow-hidden border-border/60 shadow-card" style={{ height: "calc(100vh - 220px)", minHeight: 520 }} data-testid="card-map-selected">
            <SelectionDetail
              selected={selected}
              block={selectedBlock}
              greenhouse={selectedGh}
              observation={selectedObs}
              onOpen={openSelected}
              onClear={() => setSelected(null)}
              onFocus={focusSelected}
            />
          </Card>
        )}
      </div>

      {/* Mobile / tablet: map + sheet */}
      <div className="lg:hidden space-y-3">
        <Card className="border-border/60 p-2 shadow-card">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar entidad…"
              className="pl-8 h-9 text-sm"
              data-testid="input-map-search-mobile"
            />
          </div>
        </Card>

        {query.trim() && (
          <Card className="max-h-72 overflow-hidden border-border/60 shadow-card">
            <EntityList
              blocks={blocks}
              greenhouses={greenhouses}
              selectedId={selected?.id}
              onSelect={onSelect}
              query={query}
              onQuery={setQuery}
              layers={layers}
            />
          </Card>
        )}

        <Card className="overflow-hidden border-border/60 p-0 shadow-card">
          {isLoading ? (
            <MapSkeleton height={460} />
          ) : (
            <SpatialMap
              key={focusKey}
              features={filteredFC}
              height={460}
              highlightId={selected?.id}
              onSelect={onSelect}
            />
          )}
        </Card>

        {!selected && (
          <Card className="border-border/60">
            <CardContent className="flex items-center gap-3 p-3 text-xs text-muted-foreground">
              <MapIcon className="h-4 w-4 shrink-0" />
              <span>Toca una entidad en el mapa o búscala arriba para ver detalles.</span>
            </CardContent>
          </Card>
        )}

        <Sheet open={mobileSheetOpen && !!selected} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="bottom" className="h-[70vh] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Detalle de entidad</SheetTitle>
            </SheetHeader>
            {selected && (
              <SelectionDetail
                selected={selected}
                block={selectedBlock}
                greenhouse={selectedGh}
                observation={selectedObs}
                onOpen={() => {
                  setMobileSheetOpen(false);
                  openSelected();
                }}
                onClear={() => {
                  setMobileSheetOpen(false);
                  setSelected(null);
                }}
                onFocus={focusSelected}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
