import { LayoutDashboard, ListChecks, Map as MapIcon, MoreHorizontal } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AssistantLauncher } from '@/features/assistant';

const items = [
  { to: '/today', icon: LayoutDashboard, label: 'Hoy' },
  { to: '/tasks', icon: ListChecks, label: 'Tareas' },
  { to: '/map', icon: MapIcon, label: 'Mapa' },
];

const tail = [{ to: '/more', icon: MoreHorizontal, label: 'Más' }];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 shadow-elevated backdrop-blur-md md:hidden safe-pb"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -top-px left-1/2 h-[3px] w-10 -translate-x-1/2 rounded-b-full bg-primary" />
                  )}
                  <it.icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className="leading-none">{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li className="flex items-center justify-center">
          <AssistantLauncher variant="bottom-nav" />
        </li>
        {tail.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -top-px left-1/2 h-[3px] w-10 -translate-x-1/2 rounded-b-full bg-primary" />
                  )}
                  <it.icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className="leading-none">{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
