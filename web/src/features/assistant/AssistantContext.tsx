import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * B1 scaffolding for the Assistant Dock.
 *
 * The full state machine (20 states, tool traces, drafts, confirmations)
 * lands in B3. This context only exposes open/close so the shell can wire
 * the launcher in TopBar/BottomNav/floating action.
 */

type AssistantContextValue = {
  open: boolean;
  openDock: () => void;
  closeDock: () => void;
  toggleDock: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openDock = useCallback(() => setOpen(true), []);
  const closeDock = useCallback(() => setOpen(false), []);
  const toggleDock = useCallback(() => setOpen((v) => !v), []);
  const value = useMemo(
    () => ({ open, openDock, closeDock, toggleDock }),
    [open, openDock, closeDock, toggleDock],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistant must be used inside <AssistantProvider>');
  }
  return ctx;
}
