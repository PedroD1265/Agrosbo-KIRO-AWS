import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Props {
  placeholder?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  right?: React.ReactNode;
  resultCount?: number;
  className?: string;
}

export function FilterBar({
  placeholder = 'Buscar…',
  value,
  onValueChange,
  right,
  resultCount,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value ?? ''}
          onChange={(e) => onValueChange?.(e.target.value)}
          placeholder={placeholder}
          className="h-10 pl-9 pr-9"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => onValueChange?.('')}
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {typeof resultCount === 'number' && (
          <span className="text-xs text-muted-foreground tabular">
            {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
          </span>
        )}
        {right}
      </div>
    </div>
  );
}
