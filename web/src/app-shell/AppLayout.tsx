import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { SyncIndicator } from '@/shared/ui/SyncIndicator';
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette';
import { Search, Bot } from 'lucide-react';
import { AssistantProvider, AssistantDockPlaceholder, useAssistant } from '@/features/assistant';

function MobileTopBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const { openDock, open } = useAssistant();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-card">
          <span className="text-sm font-bold">A</span>
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">AgrosBO</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            Toco · Bolivia
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={openDock}
          aria-label="Abrir asistente"
          aria-expanded={open}
          aria-haspopup="dialog"
          data-testid="button-open-assistant-mobile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bot className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label="Buscar"
          data-testid="button-open-command-palette-mobile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search className="h-4 w-4" />
        </button>
        <SyncIndicator />
      </div>
    </header>
  );
}

function AppLayoutInner() {
  const isMobile = useIsMobile();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobileTopBar onOpenCommand={() => setCmdOpen(true)} />
        <main className="px-4 pb-24 pt-4">
          <div
            key={typeof window !== 'undefined' ? window.location.pathname : ''}
            className="animate-fade-in"
          >
            <Outlet />
          </div>
        </main>
        <BottomNav />
        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
        <AssistantDockPlaceholder />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onOpenCommand={() => setCmdOpen(true)} />
          <main className="flex-1 px-6 py-6">
            <div
              key={typeof window !== 'undefined' ? window.location.pathname : ''}
              className="mx-auto w-full max-w-[1600px] animate-fade-in"
            >
              <Outlet />
            </div>
          </main>
        </div>
        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
        <AssistantDockPlaceholder />
      </div>
    </SidebarProvider>
  );
}

export function AppLayout() {
  return (
    <AssistantProvider>
      <AppLayoutInner />
    </AssistantProvider>
  );
}
