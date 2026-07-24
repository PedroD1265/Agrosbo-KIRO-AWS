import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  Warehouse,
  Sprout,
  FlaskConical,
  PackageCheck,
  Bug,
  Boxes,
  DollarSign,
  BarChart3,
  Plug,
  Settings as SettingsIcon,
  Map as MapIcon,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';

const groups: Array<{
  label: string;
  items: Array<{ to: string; icon: typeof LayoutGrid; title: string; description: string }>;
}> = [
  {
    label: 'Producción agrícola',
    items: [
      {
        to: '/blocks',
        icon: LayoutGrid,
        title: 'Bloques',
        description: 'Parcelas, cultivos y estado',
      },
      {
        to: '/greenhouses',
        icon: Warehouse,
        title: 'Invernaderos',
        description: 'Entornos protegidos',
      },
      { to: '/campaigns', icon: Sprout, title: 'Campañas', description: 'Ciclos productivos' },
      {
        to: '/applications',
        icon: FlaskConical,
        title: 'Aplicaciones',
        description: 'Fitosanitarios y carencia',
      },
      { to: '/harvest', icon: PackageCheck, title: 'Cosecha', description: 'Lotes y rendimiento' },
      { to: '/map', icon: MapIcon, title: 'Mapa', description: 'Vista geográfica' },
    ],
  },
  {
    label: 'Apicultura',
    items: [
      {
        to: '/beekeeping',
        icon: Bug,
        title: 'Apicultura',
        description: 'Apiarios, colmenas e inspecciones',
      },
    ],
  },
  {
    label: 'Recursos y finanzas',
    items: [
      { to: '/inventory', icon: Boxes, title: 'Inventario', description: 'Stock y movimientos' },
      {
        to: '/expenses',
        icon: DollarSign,
        title: 'Gastos',
        description: 'Costos y jornales (BOB)',
      },
    ],
  },
  {
    label: 'Análisis y sistema',
    items: [
      { to: '/reports', icon: BarChart3, title: 'Reportes', description: 'KPIs y exportes CSV' },
      {
        to: '/integrations',
        icon: Plug,
        title: 'Integraciones',
        description: 'Servicios conectados',
      },
      {
        to: '/settings',
        icon: SettingsIcon,
        title: 'Configuración',
        description: 'Organización y preferencias',
      },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Menú principal"
        title="Más opciones"
        subtitle="Todos los módulos de AgrosBO a un toque"
      />
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <ul className="divide-y divide-border">
                {g.items.map((it) => (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
                      data-testid={`more-link-${it.to.slice(1)}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <it.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-tight">{it.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {it.description}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
