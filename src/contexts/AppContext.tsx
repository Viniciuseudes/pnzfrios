"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useKanban } from "@/hooks/useKanban";
import { initialKanbanOrders } from "@/data/kanban";
import type { KanbanOrder, UserRole } from "@/types";

interface Session {
  role: UserRole;
  sellerId?: number;
}

interface AppContextValue {
  session: Session | null;
  login: (role: UserRole, sellerId?: number) => void;
  logout: () => void;
  orders: KanbanOrder[];
  urgentActive: number;
  advance: (id: string, note: string, by?: string) => void;
  cancel: (id: string, note: string, by?: string) => void;
  addNote: (id: string, note: string, by?: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const { orders, urgentActive, advance, cancel, addNote } = useKanban(initialKanbanOrders);

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      login: (role, sellerId) => setSession({ role, sellerId }),
      logout: () => setSession(null),
      orders,
      urgentActive,
      advance,
      cancel,
      addNote,
    }),
    [session, orders, urgentActive, advance, cancel, addNote],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp deve ser usado dentro de AppProvider");
  }
  return context;
}
