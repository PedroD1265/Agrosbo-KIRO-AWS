import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  to?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export function MobileListItem({ to, title, subtitle, right, meta, className }: Props) {
  const content = (
    <div
      className={cn(
        "flex min-h-[64px] items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-card transition-all",
        to && "active:scale-[0.99] active:bg-muted/50",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-semibold text-foreground">{title}</p>
          {right}
        </div>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {to && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
