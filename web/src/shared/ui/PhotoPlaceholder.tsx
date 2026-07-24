import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PhotoPlaceholder({ count = 1, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-md border border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground"
        >
          <ImageIcon className="h-5 w-5" />
        </div>
      ))}
    </div>
  );
}
