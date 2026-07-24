import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export function Checklist({ items, className }: { items: ChecklistItem[]; className?: string }) {
  const [state, setState] = useState(items);
  const toggle = (id: string) =>
    setState((s) => s.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

  return (
    <ul className={cn("space-y-2", className)}>
      {state.map((it) => (
        <li key={it.id} className="flex items-center gap-3 rounded-md border border-border/60 bg-card px-3 py-2">
          <Checkbox checked={it.done} onCheckedChange={() => toggle(it.id)} id={it.id} />
          <label htmlFor={it.id} className={cn("text-sm flex-1 cursor-pointer", it.done && "line-through text-muted-foreground")}>
            {it.label}
          </label>
        </li>
      ))}
    </ul>
  );
}
