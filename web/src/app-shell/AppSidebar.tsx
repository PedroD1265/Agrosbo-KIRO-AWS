import {
  LayoutDashboard,
  Squircle,
  Warehouse,
  Sprout,
  Droplets,
  ListChecks,
  NotebookPen,
  Boxes,
  PackageCheck,
  Plug,
  Settings,
  BarChart3,
  Map as MapIcon,
  FlaskConical,
  Bug,
  DollarSign,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';

const groups = [
  {
    label: 'Operación diaria',
    items: [
      { title: 'Hoy', url: '/today', icon: LayoutDashboard },
      { title: 'Mapa', url: '/map', icon: MapIcon },
      { title: 'Tareas', url: '/tasks', icon: ListChecks },
      { title: 'Riego', url: '/irrigation', icon: Droplets },
      { title: 'Observaciones', url: '/observations', icon: NotebookPen },
    ],
  },
  {
    label: 'Producción agrícola',
    items: [
      { title: 'Bloques', url: '/blocks', icon: Squircle },
      { title: 'Invernaderos', url: '/greenhouses', icon: Warehouse },
      { title: 'Campañas', url: '/campaigns', icon: Sprout },
      { title: 'Aplicaciones', url: '/applications', icon: FlaskConical },
      { title: 'Cosecha', url: '/harvest', icon: PackageCheck },
    ],
  },
  {
    label: 'Apicultura',
    items: [{ title: 'Apicultura', url: '/beekeeping', icon: Bug }],
  },
  {
    label: 'Recursos y finanzas',
    items: [
      { title: 'Inventario', url: '/inventory', icon: Boxes },
      { title: 'Gastos', url: '/expenses', icon: DollarSign },
    ],
  },
  {
    label: 'Análisis y sistema',
    items: [
      { title: 'Reportes', url: '/reports', icon: BarChart3 },
      { title: 'Integraciones', url: '/integrations', icon: Plug },
      { title: 'Configuración', url: '/settings', icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Sprout className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground leading-tight">AgrosBO</p>
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                Bolivia · Toco
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50">
                {g.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={it.url}
                        className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <it.icon className="h-4 w-4" />
                        {!collapsed && <span>{it.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
