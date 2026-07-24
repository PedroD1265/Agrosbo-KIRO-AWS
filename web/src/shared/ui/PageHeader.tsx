import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, meta, eyebrow, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border/60 pb-5 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/80">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[28px] md:leading-tight">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
