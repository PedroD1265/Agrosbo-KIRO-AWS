import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpFromLine, Upload, Zap } from 'lucide-react';
import { AlertBanner } from '@/shared/ui/AlertBanner';
import { apiRequest } from '@/lib/queryClient';
import type { ImportResult } from '@shared/schema';
import { IMPORT_DATASETS, type ImportDatasetId } from './integrationUtils';

export function ImportPanel() {
  const [dataset, setDataset] = useState<ImportDatasetId>('blocks');
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewMut = useMutation({
    mutationFn: (csv: string) =>
      apiRequest<ImportResult>('POST', `/api/integrations/import/${dataset}`, {
        csv,
        dryRun: true,
      }),
    onSuccess: (result) => {
      setPreviewResult(result);
    },
    onError: (e: Error) => {
      toast.error('No se pudo procesar el CSV', { description: e.message });
    },
  });

  const qc = useQueryClient();
  const commitMut = useMutation({
    mutationFn: () =>
      apiRequest<ImportResult>('POST', `/api/integrations/import/${dataset}`, {
        csv: csvText,
        dryRun: false,
      }),
    onSuccess: (result) => {
      if (result.committed) {
        toast.success(`${result.validRows} filas importadas`, {
          description: 'Los datos ya están disponibles en la app.',
        });
        qc.invalidateQueries({ queryKey: [`/api/${dataset}`] });
        setCsvText(null);
        setFileName(null);
        setPreviewResult(null);
        if (fileRef.current) fileRef.current.value = '';
      } else {
        toast.error('No se pudo importar', {
          description: 'Corrige los errores antes de continuar.',
        });
      }
    },
    onError: (e: Error) => {
      toast.error('No se pudo importar el CSV', { description: e.message });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreviewResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      previewMut.mutate(text);
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleReset() {
    setCsvText(null);
    setFileName(null);
    setPreviewResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const canCommit =
    previewResult &&
    previewResult.columnErrors.length === 0 &&
    previewResult.errors.length === 0 &&
    previewResult.validRows > 0 &&
    csvText;

  const stepNumber = !fileName ? 1 : !previewResult ? 2 : 3;

  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <ArrowUpFromLine className="h-4 w-4" />
          </div>
          Importar datos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Carga masiva con validación previa. La importación solo se ejecuta si todas las filas son
          válidas.
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium">
          {[
            { n: 1, label: 'Seleccionar' },
            { n: 2, label: 'Validar' },
            { n: 3, label: 'Confirmar' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                  stepNumber >= s.n
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {s.n}
              </span>
              <span className={cn(stepNumber >= s.n ? 'text-foreground' : 'text-muted-foreground')}>
                {s.label}
              </span>
              {i < 2 && <span className="mx-1 h-px w-6 bg-border" />}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52">
            <Select
              value={dataset}
              onValueChange={(v) => {
                setDataset(v as ImportDatasetId);
                handleReset();
              }}
            >
              <SelectTrigger data-testid="select-import-dataset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_DATASETS.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id}>
                    {ds.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label
            htmlFor="csv-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
            data-testid="label-file-upload"
          >
            <Upload className="h-3.5 w-3.5" />
            {fileName ?? 'Seleccionar archivo CSV'}
            <input
              id="csv-upload"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFileChange}
              data-testid="input-csv-upload"
            />
          </label>
          {fileName && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              data-testid="button-reset-import"
            >
              Limpiar
            </Button>
          )}
        </div>

        {previewMut.isPending && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        )}

        {previewResult && (
          <div className="space-y-3" data-testid="section-import-preview">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Total
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular" data-testid="text-total-rows">
                  {previewResult.totalRows}
                </p>
              </div>
              <div className="rounded-md border border-status-ok/20 bg-status-ok-soft px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-status-ok">
                  Válidas
                </p>
                <p
                  className="mt-0.5 text-lg font-semibold tabular text-status-ok"
                  data-testid="text-valid-rows"
                >
                  {previewResult.validRows}
                </p>
              </div>
              <div
                className={cn(
                  'rounded-md border px-3 py-2',
                  previewResult.columnErrors.length > 0
                    ? 'border-status-critical/20 bg-status-critical-soft'
                    : 'border-border/60 bg-muted/30',
                )}
              >
                <p
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wide',
                    previewResult.columnErrors.length > 0
                      ? 'text-status-critical'
                      : 'text-muted-foreground',
                  )}
                >
                  Columnas
                </p>
                <p
                  className={cn(
                    'mt-0.5 text-lg font-semibold tabular',
                    previewResult.columnErrors.length > 0
                      ? 'text-status-critical'
                      : 'text-foreground',
                  )}
                  data-testid="text-column-error-count"
                >
                  {previewResult.columnErrors.length === 0
                    ? 'OK'
                    : `−${previewResult.columnErrors.length}`}
                </p>
              </div>
              <div
                className={cn(
                  'rounded-md border px-3 py-2',
                  previewResult.errors.length > 0
                    ? 'border-status-critical/20 bg-status-critical-soft'
                    : 'border-border/60 bg-muted/30',
                )}
              >
                <p
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wide',
                    previewResult.errors.length > 0
                      ? 'text-status-critical'
                      : 'text-muted-foreground',
                  )}
                >
                  Filas con error
                </p>
                <p
                  className={cn(
                    'mt-0.5 text-lg font-semibold tabular',
                    previewResult.errors.length > 0 ? 'text-status-critical' : 'text-foreground',
                  )}
                  data-testid="text-error-rows"
                >
                  {new Set(previewResult.errors.map((e) => e.row)).size}
                </p>
              </div>
            </div>

            {previewResult.columnErrors.length > 0 && (
              <div
                className="rounded-md border border-status-critical/30 bg-status-critical-soft p-3"
                data-testid="section-column-errors"
              >
                <p className="mb-2 text-xs font-semibold text-status-critical">
                  Columnas requeridas faltantes — el archivo no tiene el formato correcto:
                </p>
                <div className="space-y-1">
                  {previewResult.columnErrors.map((err, i) => (
                    <div
                      key={i}
                      className="text-xs text-status-critical"
                      data-testid={`row-column-error-${i}`}
                    >
                      Columna <span className="font-medium">"{err.field}"</span>: {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewResult.columnErrors.length === 0 && previewResult.preview.length > 0 && (
              <div
                className="overflow-x-auto rounded-md border border-border"
                data-testid="table-import-preview"
              >
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left w-10">Fila</th>
                      <th className="px-2 py-2 text-left w-16">Estado</th>
                      {Object.keys(previewResult.preview[0]?.data ?? {}).map((col) => (
                        <th key={col} className="px-2 py-2 text-left max-w-[120px] truncate">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.preview.map((prow) => (
                      <tr
                        key={prow.row}
                        className={`border-b last:border-0 ${prow.valid ? '' : 'bg-status-critical-soft/40'}`}
                        data-testid={`row-preview-${prow.row}`}
                      >
                        <td className="px-2 py-1.5 text-muted-foreground tabular">{prow.row}</td>
                        <td className="px-2 py-1.5">
                          {prow.valid ? (
                            <span className="text-status-ok font-medium">✓</span>
                          ) : (
                            <span className="text-status-critical font-medium">✗</span>
                          )}
                        </td>
                        {Object.values(prow.data).map((val, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-1.5 max-w-[120px] truncate text-foreground"
                          >
                            {String(val ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewResult.totalRows > 10 && (
                  <p className="px-3 py-2 text-[10px] text-muted-foreground border-t">
                    Mostrando primeras 10 de {previewResult.totalRows} filas
                  </p>
                )}
              </div>
            )}

            {previewResult.columnErrors.length === 0 && previewResult.errors.length > 0 && (
              <div
                className="rounded-md border border-status-critical/30 bg-status-critical-soft p-3"
                data-testid="section-import-errors"
              >
                <p className="mb-2 text-xs font-semibold text-status-critical">
                  Errores de validación — corrija el archivo y vuelva a cargarlo:
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {previewResult.errors.map((err, i) => (
                    <div
                      key={i}
                      className="text-xs text-status-critical"
                      data-testid={`row-import-error-${i}`}
                    >
                      Fila {err.row} · <span className="font-medium">{err.field}</span>:{' '}
                      {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewResult.columnErrors.length === 0 && previewResult.errors.length === 0 && (
              <AlertBanner
                level="ok"
                title={`${previewResult.validRows} fila${previewResult.validRows !== 1 ? 's' : ''} válida${previewResult.validRows !== 1 ? 's' : ''} — listo para importar`}
                description="Revise la vista previa y confirme la importación."
              />
            )}

            <Button
              className="w-full"
              disabled={!canCommit || commitMut.isPending}
              onClick={() => commitMut.mutate()}
              data-testid="button-confirm-import"
            >
              <Zap className="h-4 w-4" />
              {commitMut.isPending
                ? 'Importando…'
                : `Confirmar importación (${previewResult.validRows} filas)`}
            </Button>
          </div>
        )}

        <div className="rounded-md border border-border/50 bg-muted/30 p-3">
          <p className="text-xs font-semibold text-foreground mb-1.5">
            Columnas requeridas por dataset
          </p>
          <div className="space-y-1 text-[11px] text-muted-foreground font-mono">
            <div>
              <span className="font-semibold text-foreground font-sans">Bloques:</span> name, farm,
              areaHa, crop, stage, lastIrrigation, status
            </div>
            <div>
              <span className="font-semibold text-foreground font-sans">Invernaderos:</span> name,
              areaM2, crop, stage, status
            </div>
            <div>
              <span className="font-semibold text-foreground font-sans">Inventario:</span> name,
              category, unit, stock, min, lastMovement
            </div>
            <div>
              <span className="font-semibold text-foreground font-sans">Tareas:</span> title,
              scopeType, scopeId, assignee, dueDate, priority
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
            Formato: UTF-8, delimitador coma. Los valores con comas deben ir entre comillas dobles.
            Los campos con saltos de línea no son soportados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
