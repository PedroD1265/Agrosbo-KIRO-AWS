import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, Pencil, X, AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  summary?: string;
  fields?: React.ReactNode;
  warnings?: string[];
  missingFields?: string[];
  onConfirm: () => void;
  onCorrect?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  correctLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * ConfirmActionPanel — used by the Assistant Dock (B3), Vision drafts (B6)
 * and Scenario drafts (§15) to gate every mutation behind explicit human
 * confirmation. Never mutates on its own; only invokes callbacks.
 */
export function ConfirmActionPanel({
  title,
  summary,
  fields,
  warnings,
  missingFields,
  onConfirm,
  onCorrect,
  onCancel,
  confirmLabel = 'Confirmar',
  correctLabel = 'Corregir',
  cancelLabel = 'Cancelar',
  isSubmitting = false,
  disabled = false,
  className,
}: Props) {
  const hasMissing = missingFields && missingFields.length > 0;
  const confirmDisabled = disabled || isSubmitting || hasMissing;
  return (
    <section
      aria-label="Confirmación de acción"
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-primary/30 bg-card p-4 shadow-card',
        className,
      )}
      data-testid="confirm-action-panel"
    >
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
          Acción por confirmar
        </p>
        <h3 className="mt-1 text-base font-semibold text-foreground">{title}</h3>
        {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
      </header>

      {fields && <div>{fields}</div>}

      {hasMissing && (
        <div className="flex items-start gap-2 rounded-md border border-status-warn/30 bg-status-warn-soft px-3 py-2 text-xs text-status-warn">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Datos faltantes</p>
            <ul className="mt-0.5 list-disc pl-4 text-status-warn/90">
              {missingFields!.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-status-warn/30 bg-status-warn-soft px-3 py-2 text-xs text-status-warn">
          {warnings.map((w) => (
            <p key={w} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>{w}</span>
            </p>
          ))}
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="confirm-action-cancel"
          >
            <X className="mr-1.5 h-3.5 w-3.5" aria-hidden /> {cancelLabel}
          </Button>
        )}
        {onCorrect && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCorrect}
            disabled={isSubmitting}
            data-testid="confirm-action-correct"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden /> {correctLabel}
          </Button>
        )}
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={confirmDisabled}
          aria-disabled={confirmDisabled}
          data-testid="confirm-action-confirm"
        >
          <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden /> {confirmLabel}
        </Button>
      </footer>
    </section>
  );
}
