import { Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SyncIndicator } from '@/shared/ui/SyncIndicator';
import { Search, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';

interface TopBarProps {
  onOpenCommand: () => void;
}

export function TopBar({ onOpenCommand }: TopBarProps) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const { user, enforcement, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <button
        type="button"
        onClick={onOpenCommand}
        data-testid="button-open-command-palette"
        className="hidden md:flex flex-1 max-w-md items-center gap-2.5 rounded-md border border-transparent bg-muted/40 px-3 h-9 text-sm text-muted-foreground transition-colors hover:bg-muted hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Abrir paleta de comandos"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar bloque, tarea, lote…</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 text-[10px] font-mono text-muted-foreground">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        <SyncIndicator />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Cuenta"
              data-testid="button-user-menu"
            >
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <div className="text-sm font-medium" data-testid="text-user-name">
                {user?.name ?? 'Sin sesión'}
              </div>
              <div className="text-[11px] text-muted-foreground" data-testid="text-user-role">
                {user
                  ? `Rol: ${user.role}`
                  : enforcement === 'off'
                    ? 'auth desactivada'
                    : 'no autenticado'}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="link-account-settings">
              <Link to="/settings">
                <SettingsIcon className="h-4 w-4 mr-2" /> Configuración
              </Link>
            </DropdownMenuItem>
            {enforcement === 'on' && user && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void logout();
                  }}
                  data-testid="button-logout"
                  className="text-status-critical focus:text-status-critical"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
