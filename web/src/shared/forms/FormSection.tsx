import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Agrupa campos de formulario bajo un encabezado consistente.
 * Mejora la jerarquía visual y reduce la sensación de "muro de inputs".
 */
export function FormSection({ title, description, children, className }: Props) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-baseline justify-between gap-2 border-b border-border/50 pb-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {description && <p className="text-[11px] text-muted-foreground/80">{description}</p>}
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}
