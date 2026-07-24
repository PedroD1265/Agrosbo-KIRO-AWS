import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportAction {
  label: string;
  onExport: () => void;
  testId?: string;
  count?: number;
}

interface Props {
  actions: ExportAction[];
}

export function ExportBar({ actions }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Button
          key={a.label}
          size="sm"
          variant="outline"
          onClick={a.onExport}
          data-testid={a.testId ?? `button-export-${a.label.toLowerCase().replace(/\s+/g, '-')}`}
          className="h-8 gap-1.5 text-xs font-medium"
          disabled={a.count === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar {a.label}
          {typeof a.count === 'number' && (
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
              {a.count}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
