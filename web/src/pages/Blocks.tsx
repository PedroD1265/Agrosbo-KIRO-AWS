import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/shared/ui/PageHeader';
import { FilterBar } from '@/shared/ui/FilterBar';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { StageBadge } from '@/shared/ui/StageBadge';
import { MobileListItem } from '@/shared/ui/MobileListItem';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { RowActionsMenu } from '@/shared/ui/RowActionsMenu';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { QuickCaptureDrawer } from '@/shared/ui/QuickCaptureDrawer';
import { BlockForm } from '@/shared/forms/BlockForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Plus, AlertTriangle, MapPinned, Sprout } from 'lucide-react';
import { SortableHeader } from '@/shared/ui/SortableHeader';
import { MetricCard } from '@/shared/ui/MetricCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBlocks } from '@/hooks/data';
import { queueDeleteBlock } from '@/hooks/data/mutations';
import type { Block } from '@shared/schema';

type SortKey =
  'name' | 'farm' | 'areaHa' | 'crop' | 'stage' | 'lastIrrigation' | 'status' | 'alerts';

export default function BlocksPage() {
  const [q, setQ] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Block | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: blocks = [], isLoading } = useBlocks();
  const handleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };
  const filtered = (() => {
    const base = blocks.filter((b) =>
      [b.name, b.crop, b.farm].join(' ').toLowerCase().includes(q.toLowerCase()),
    );
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return sign * a.name.localeCompare(b.name);
        case 'farm':
          return sign * a.farm.localeCompare(b.farm);
        case 'areaHa':
          return sign * (a.areaHa - b.areaHa);
        case 'crop':
          return sign * a.crop.localeCompare(b.crop);
        case 'stage':
          return sign * a.stage.localeCompare(b.stage);
        case 'lastIrrigation':
          return sign * a.lastIrrigation.localeCompare(b.lastIrrigation);
        case 'status':
          return sign * a.status.localeCompare(b.status);
        case 'alerts':
          return sign * (a.alerts - b.alerts);
        default:
          return 0;
      }
    });
  })();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await queueDeleteBlock(deleteId);
      toast.success('Bloque eliminado');
    } catch (err) {
      toast.error('No se pudo eliminar', { description: (err as Error).message });
    } finally {
      setDeleteId(null);
    }
  };

  const totalHa = blocks.reduce((s, b) => s + (b.areaHa ?? 0), 0);
  const alertCount = blocks.reduce((s, b) => s + (b.alerts ?? 0), 0);
  const criticalCount = blocks.filter((b) => b.status === 'critical').length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operación · Parcelas"
        title="Bloques"
        subtitle={`${blocks.length} bloques activos en operación`}
        actions={
          <QuickCaptureDrawer
            open={openCreate}
            onOpenChange={setOpenCreate}
            trigger={
              <Button size="sm" data-testid="button-new-block">
                <Plus className="h-4 w-4" /> Nuevo bloque
              </Button>
            }
            title="Nuevo bloque"
            description="Alta de bloque/parcela"
          >
            <BlockForm onDone={() => setOpenCreate(false)} />
          </QuickCaptureDrawer>
        }
      />
      {blocks.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Bloques" value={blocks.length} icon={LayoutGrid} tone="primary" />
          <MetricCard
            label="Superficie total"
            value={`${totalHa.toFixed(1)} ha`}
            icon={MapPinned}
          />
          <MetricCard
            label="Cultivos distintos"
            value={new Set(blocks.map((b) => b.crop)).size}
            icon={Sprout}
          />
          <MetricCard
            label="Alertas activas"
            value={alertCount}
            icon={AlertTriangle}
            tone={alertCount > 0 ? 'critical' : 'ok'}
            hint={criticalCount > 0 ? `${criticalCount} en estado crítico` : 'Todo bajo control'}
          />
        </div>
      )}
      <FilterBar
        value={q}
        onValueChange={setQ}
        placeholder="Buscar bloque, cultivo o predio…"
        resultCount={blocks.length > 0 ? filtered.length : undefined}
      />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : blocks.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Aún no tienes bloques"
          description="Crea tu primer bloque para comenzar a registrar campañas, riegos, tareas y cosechas."
          action={
            <Button
              size="sm"
              onClick={() => setOpenCreate(true)}
              data-testid="button-empty-new-block"
            >
              <Plus className="h-4 w-4" /> Crear bloque
            </Button>
          }
        />
      ) : isMobile ? (
        <div className="space-y-2">
          {filtered.map((b) => (
            <div key={b.id} className="relative">
              <MobileListItem
                to={`/blocks/${b.id}`}
                title={b.name}
                subtitle={`${b.crop} · ${b.farm} · ${b.areaHa} ha`}
                right={<StatusBadge status={b.status} />}
                meta={
                  <>
                    <StageBadge stage={b.stage} />
                    <span className="text-xs text-muted-foreground">
                      Riego: {new Date(b.lastIrrigation).toLocaleDateString('es-BO')}
                    </span>
                  </>
                }
              />
              <div className="absolute right-2 top-2">
                <RowActionsMenu
                  testId={`block-${b.id}`}
                  onEdit={() => setEditing(b)}
                  onDelete={() => setDeleteId(b.id)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <SortableHeader<SortKey>
                    label="Bloque"
                    sortKey="name"
                    active={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader<SortKey>
                    label="Predio"
                    sortKey="farm"
                    active={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader<SortKey>
                    label="Sup. (ha)"
                    sortKey="areaHa"
                    active={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader<SortKey>
                    label="Cultivo"
                    sortKey="crop"
                    active={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader<SortKey>
                    label="Etapa"
                    sortKey="stage"
                    active={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader<SortKey>
                    label="Último riego"
                    sortKey="lastIrrigation"
                    active={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader<SortKey>
                    label="Estado"
                    sortKey="status"
                    active={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader<SortKey>
                    label="Alertas"
                    sortKey="alerts"
                    active={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="w-12 px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/blocks/${b.id}`)}
                    data-testid={`row-block-${b.id}`}
                    className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.farm}</td>
                    <td className="px-4 py-3 text-right tabular">{b.areaHa.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      {b.crop}
                      {b.variety && <span className="text-muted-foreground"> · {b.variety}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={b.stage} />
                    </td>
                    <td className="px-4 py-3 tabular text-muted-foreground">
                      {new Date(b.lastIrrigation).toLocaleDateString('es-BO')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular">
                      {b.alerts > 0 ? (
                        <span className="text-status-critical font-medium">{b.alerts}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <RowActionsMenu
                        testId={`block-${b.id}`}
                        onEdit={() => setEditing(b)}
                        onDelete={() => setDeleteId(b.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <QuickCaptureDrawer
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        trigger={<span />}
        title={editing ? `Editar · ${editing.name}` : 'Editar bloque'}
        description="Actualiza datos del bloque"
      >
        {editing && <BlockForm block={editing} onDone={() => setEditing(null)} />}
      </QuickCaptureDrawer>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar bloque?"
        description="Esta acción no se puede deshacer. Las campañas, riegos, tareas, observaciones y cosechas asociadas mantendrán su histórico pero quedarán huérfanas."
        confirmLabel="Eliminar bloque"
        onConfirm={handleDelete}
        testId="delete-block"
      />
    </div>
  );
}
