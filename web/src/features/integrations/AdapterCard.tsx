import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Globe,
  Play,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Info,
  Clock,
  CircleDot,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { Adapter, AdapterTestResult } from '@shared/schema';
import {
  ADAPTER_ICONS,
  stateToStatus,
  stateLabel,
  readinessLabel,
  readinessBadgeClass,
  relativeTime,
} from './integrationUtils';

function AdapterDetailSheet({
  adapter,
  open,
  onClose,
}: {
  adapter: Adapter;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: detail } = useQuery<Adapter>({
    queryKey: ['/api/integrations/adapters', adapter.id],
    enabled: open,
  });
  const d = detail ?? adapter;
  const Icon = ADAPTER_ICONS[d.type] ?? Globe;
  const [detailTestResult, setDetailTestResult] = useState<AdapterTestResult | null>(null);

  const detailTestMut = useMutation({
    mutationFn: () =>
      apiRequest<AdapterTestResult>('POST', `/api/integrations/adapters/${adapter.id}/test`),
    onSuccess: (result) => {
      setDetailTestResult(result);
      qc.invalidateQueries({ queryKey: ['/api/integrations/adapters'] });
      qc.invalidateQueries({ queryKey: ['/api/integrations/adapters', adapter.id] });
    },
    onError: (e: Error) => {
      toast.error('No se pudo ejecutar el test', { description: e.message });
    },
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setDetailTestResult(null);
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon className="h-4 w-4" />
            </div>
            {d.name}
          </SheetTitle>
          <SheetDescription>{d.description}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">Tipo</span>
            <span className="font-medium">{d.type}</span>
            <span className="text-muted-foreground">Estado</span>
            <StatusBadge status={stateToStatus(d.state)} label={stateLabel(d.state)} />
            <span className="text-muted-foreground">Preparación</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium w-fit ${readinessBadgeClass(d.readiness)}`}
            >
              {readinessLabel(d.readiness)}
            </span>
            <span className="text-muted-foreground">Habilitado</span>
            <span className="font-medium">{d.enabled ? 'Sí' : 'No'}</span>
            <span className="text-muted-foreground">Requiere secretos</span>
            <span className="font-medium">{d.requiresSecrets ? 'Sí' : 'No'}</span>
            <span className="text-muted-foreground">Último check</span>
            <span className="font-medium text-xs">
              {d.lastCheckAt ? new Date(d.lastCheckAt).toLocaleString('es-BO') : '—'}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Capacidades
            </p>
            <div className="flex flex-wrap gap-1.5">
              {d.capabilities.map((cap) => (
                <Badge key={cap} variant="outline" className="text-[10px] px-1.5 py-0">
                  {cap}
                </Badge>
              ))}
            </div>
          </div>
          <div className="border-t border-border/60 pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Test local
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={detailTestMut.isPending}
              onClick={() => detailTestMut.mutate()}
              data-testid={`button-detail-test-${adapter.id}`}
            >
              <Play className="h-3.5 w-3.5" />
              {detailTestMut.isPending ? 'Ejecutando…' : 'Ejecutar test local'}
            </Button>
            {detailTestResult && (
              <div
                className={`rounded-md px-3 py-2 text-xs ${detailTestResult.success ? 'bg-status-ok-soft text-status-ok' : 'bg-status-idle-soft text-muted-foreground'}`}
                data-testid={`text-detail-test-result-${adapter.id}`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {detailTestResult.success ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {detailTestResult.message}
                </div>
                {detailTestResult.details && (
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(detailTestResult.details).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="opacity-70">{k}:</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdapterCard({ adapter }: { adapter: Adapter }) {
  const qc = useQueryClient();
  const Icon = ADAPTER_ICONS[adapter.type] ?? Globe;
  const [testResult, setTestResult] = useState<AdapterTestResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest<Adapter>('POST', `/api/integrations/adapters/${adapter.id}/toggle`, { enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/integrations/adapters'] });
    },
    onError: (e: Error) => {
      toast.error('No se pudo cambiar el estado', { description: e.message });
    },
  });

  const testMut = useMutation({
    mutationFn: () =>
      apiRequest<AdapterTestResult>('POST', `/api/integrations/adapters/${adapter.id}/test`),
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success(`Test exitoso: ${adapter.name}`, { description: result.message });
      } else {
        toast.info(`Test completado: ${adapter.name}`, { description: result.message });
      }
      qc.invalidateQueries({ queryKey: ['/api/integrations/adapters'] });
    },
    onError: (e: Error) => {
      toast.error('No se pudo ejecutar el test', { description: e.message });
    },
  });

  const isActive = adapter.readiness === 'ready' && adapter.enabled;
  const accentClass = isActive
    ? 'before:bg-status-ok'
    : adapter.requiresSecrets
      ? 'before:bg-status-warn'
      : 'before:bg-border';

  return (
    <Card
      data-testid={`card-adapter-${adapter.id}`}
      className={cn(
        'relative flex flex-col overflow-hidden border-border/60 shadow-card transition-all hover:shadow-elevated',
        'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]',
        accentClass,
      )}
    >
      <CardContent className="flex flex-col gap-3.5 p-5 pl-[22px] flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight truncate">{adapter.name}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {adapter.type}
              </p>
            </div>
          </div>
          <StatusBadge status={stateToStatus(adapter.state)} label={stateLabel(adapter.state)} />
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">{adapter.description}</p>

        <div className="flex flex-wrap gap-1">
          {adapter.capabilities.slice(0, 4).map((cap) => (
            <Badge
              key={cap}
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-mono"
              data-testid={`badge-capability-${adapter.id}-${cap}`}
            >
              {cap}
            </Badge>
          ))}
          {adapter.capabilities.length > 4 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              +{adapter.capabilities.length - 4}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${readinessBadgeClass(adapter.readiness)}`}
            data-testid={`text-readiness-${adapter.id}`}
          >
            <CircleDot className="h-2.5 w-2.5" />
            {readinessLabel(adapter.readiness)}
          </span>
          <span
            className="flex items-center gap-1 text-muted-foreground"
            data-testid={`text-last-check-${adapter.id}`}
          >
            <Clock className="h-3 w-3" />
            {relativeTime(adapter.lastCheckAt)}
          </span>
        </div>

        {testResult && (
          <div
            className={`rounded-md px-3 py-2 text-xs ${testResult.success ? 'bg-status-ok-soft text-status-ok' : 'bg-status-idle-soft text-muted-foreground'}`}
            data-testid={`text-test-result-${adapter.id}`}
          >
            <div className="flex items-center gap-1.5 font-medium">
              {testResult.success ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {testResult.message}
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={testMut.isPending}
              onClick={() => testMut.mutate()}
              data-testid={`button-test-${adapter.id}`}
            >
              <Play className="h-3.5 w-3.5" />
              {testMut.isPending ? 'Ejecutando…' : 'Test'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailOpen(true)}
              data-testid={`button-detail-${adapter.id}`}
              title="Ver detalles"
            >
              <Info className="h-3.5 w-3.5" />
              Detalles
            </Button>
          </div>
          {adapter.requiresSecrets ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              disabled
              data-testid={`button-toggle-${adapter.id}`}
            >
              <Lock className="h-3.5 w-3.5" /> Requiere configuración futura
            </Button>
          ) : (
            <Button
              variant={adapter.enabled ? 'default' : 'outline'}
              size="sm"
              className="w-full"
              disabled={toggleMut.isPending}
              onClick={() => toggleMut.mutate(!adapter.enabled)}
              data-testid={`button-toggle-${adapter.id}`}
            >
              {adapter.enabled ? (
                <>
                  <ToggleRight className="h-3.5 w-3.5" /> Deshabilitar
                </>
              ) : (
                <>
                  <ToggleLeft className="h-3.5 w-3.5" /> Habilitar
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>

      <AdapterDetailSheet
        adapter={adapter}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </Card>
  );
}
