import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, Map as MapIcon, ListChecks, Droplets, NotebookPen,
  Squircle, Warehouse, Sprout, PackageCheck, Boxes, BarChart3, Plug,
  Settings, Plus, RefreshCw, DollarSign,
} from "lucide-react";
import { useBlocks, useGreenhouses } from "@/hooks/data";
import { triggerSync } from "@/lib/sync/engine";
import { toast } from "sonner";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NAV_ITEMS = [
  { label: "Today", path: "/today", icon: LayoutDashboard, group: "Navegación" },
  { label: "Mapa", path: "/map", icon: MapIcon, group: "Navegación" },
  { label: "Tareas", path: "/tasks", icon: ListChecks, group: "Navegación", shortcut: "g t" },
  { label: "Riego", path: "/irrigation", icon: Droplets, group: "Navegación", shortcut: "g r" },
  { label: "Observaciones", path: "/observations", icon: NotebookPen, group: "Navegación" },
  { label: "Bloques", path: "/blocks", icon: Squircle, group: "Estructura" },
  { label: "Invernaderos", path: "/greenhouses", icon: Warehouse, group: "Estructura" },
  { label: "Campañas", path: "/campaigns", icon: Sprout, group: "Estructura" },
  { label: "Cosecha", path: "/harvest", icon: PackageCheck, group: "Producción" },
  { label: "Inventario", path: "/inventory", icon: Boxes, group: "Producción" },
  { label: "Gastos", path: "/expenses", icon: DollarSign, group: "Finanzas" },
  { label: "Reportes", path: "/reports", icon: BarChart3, group: "Sistema" },
  { label: "Integraciones", path: "/integrations", icon: Plug, group: "Sistema" },
  { label: "Configuración", path: "/settings", icon: Settings, group: "Sistema" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();

  const navByGroup = useMemo(() => {
    const acc: Record<string, typeof NAV_ITEMS> = {};
    for (const item of NAV_ITEMS) {
      (acc[item.group] ??= []).push(item);
    }
    return acc;
  }, []);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar página, bloque, invernadero o acción…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading="Acciones rápidas">
          <CommandItem
            value="nueva tarea"
            onSelect={() => go("/tasks")}
            data-testid="command-new-task"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva tarea</span>
            <CommandShortcut>n t</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="nuevo riego"
            onSelect={() => go("/irrigation")}
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo riego</span>
            <CommandShortcut>n r</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="nueva observacion"
            onSelect={() => go("/observations")}
          >
            <Plus className="h-4 w-4" />
            <span>Nueva observación</span>
          </CommandItem>
          <CommandItem
            value="sincronizar ahora"
            onSelect={() => {
              triggerSync();
              toast.success("Sincronización iniciada");
              onOpenChange(false);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Sincronizar ahora</span>
          </CommandItem>
        </CommandGroup>

        {Object.entries(navByGroup).map(([group, items]) => (
          <div key={group}>
            <CommandSeparator />
            <CommandGroup heading={group}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.path}
                    value={`${item.label} ${item.path}`}
                    onSelect={() => go(item.path)}
                    data-testid={`command-nav-${item.path.slice(1)}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}

        {blocks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Bloques">
              {blocks.slice(0, 20).map((b) => (
                <CommandItem
                  key={b.id}
                  value={`bloque ${b.name} ${b.crop ?? ""}`}
                  onSelect={() => go(`/blocks/${b.id}`)}
                  data-testid={`command-block-${b.id}`}
                >
                  <Squircle className="h-4 w-4" />
                  <span>{b.name}</span>
                  {b.crop && <span className="ml-auto text-xs text-muted-foreground">{b.crop}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {greenhouses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Invernaderos">
              {greenhouses.slice(0, 20).map((g) => (
                <CommandItem
                  key={g.id}
                  value={`invernadero ${g.name} ${g.crop ?? ""}`}
                  onSelect={() => go(`/greenhouses/${g.id}`)}
                  data-testid={`command-greenhouse-${g.id}`}
                >
                  <Warehouse className="h-4 w-4" />
                  <span>{g.name}</span>
                  {g.crop && <span className="ml-auto text-xs text-muted-foreground">{g.crop}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** Hook que abre el palette con Cmd/Ctrl+K o `/`. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // `/` solo si no estamos escribiendo en un input/textarea
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        const editing = tag === "input" || tag === "textarea" || (t?.isContentEditable ?? false);
        if (!editing) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}
