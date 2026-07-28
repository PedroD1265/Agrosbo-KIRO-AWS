import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useAssistant } from './AssistantContext';
import { Bot, Sparkles, Mic, ClipboardCheck } from 'lucide-react';

/**
 * B1 placeholder Assistant Dock.
 *
 * Renders as a right-side sheet on desktop/tablet and as a bottom sheet on mobile.
 * The real dock (conversation, tool trace, drafts, confirmation, voice) is
 * implemented in B3/B4. This placeholder makes the shell wiring reviewable
 * and keeps the entry point stable so later blocks only swap the body.
 */
export function AssistantDockPlaceholder() {
  const { open, closeDock } = useAssistant();
  return (
    <Sheet open={open} onOpenChange={(v) => (v ? undefined : closeDock())}>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-md"
        data-testid="assistant-dock-placeholder"
      >
        <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold">Asistente AGROSBO</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Vista previa · disponible en B3
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <p className="text-sm text-muted-foreground">
            El Asistente operativo estará disponible en el bloque B3. Aquí podrás:
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                Consultar el estado de la finca, tareas del día, clima e inventario en lenguaje natural.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3">
              <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                Preparar borradores de tareas, asignaciones y observaciones que
                <strong className="font-medium"> siempre requerirán tu confirmación</strong> antes de guardarse.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3">
              <Mic className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>Grabar notas de voz con transcripción editable (B4).</span>
            </li>
          </ul>

          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            Este panel es solo un contenedor. Ninguna acción del Asistente se ejecutará
            sin revisión y confirmación humana explícita.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
