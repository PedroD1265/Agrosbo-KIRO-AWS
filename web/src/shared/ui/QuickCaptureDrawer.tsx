import { CloudOff } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { cn } from '@/lib/utils';

interface Props {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  side?: 'right' | 'bottom';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Sólo en mobile: limita la altura para sentir más “bottom sheet” real (default: 92vh). */
  mobileMaxHeight?: string;
}

export function QuickCaptureDrawer({
  trigger,
  title,
  description,
  children,
  side,
  open,
  onOpenChange,
  mobileMaxHeight = '92vh',
}: Props) {
  const isMobile = useIsMobile();
  const resolvedSide = side ?? (isMobile ? 'bottom' : 'right');
  const { online } = useSyncStatus();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={resolvedSide}
        className={cn(
          'flex flex-col gap-0 p-0',
          resolvedSide === 'right' && 'w-full sm:max-w-md',
          resolvedSide === 'bottom' && 'rounded-t-2xl',
        )}
        style={resolvedSide === 'bottom' ? { maxHeight: mobileMaxHeight } : undefined}
      >
        {resolvedSide === 'bottom' && (
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
          </div>
        )}
        <SheetHeader
          className={cn(
            'sticky top-0 z-10 border-b border-border/60 bg-card/95 px-6 py-4 text-left backdrop-blur-md',
            resolvedSide === 'bottom' && 'pt-2',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg leading-tight">{title}</SheetTitle>
              {description && (
                <SheetDescription className="text-[13px]">{description}</SheetDescription>
              )}
            </div>
            {!online && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-warn-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-warn"
                title="Sin conexión: los cambios quedarán en cola local"
              >
                <CloudOff className="h-3 w-3" /> Offline
              </span>
            )}
          </div>
        </SheetHeader>
        <div
          className={cn(
            'flex-1 overflow-y-auto px-6 py-5',
            resolvedSide === 'bottom' && 'pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
          )}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
