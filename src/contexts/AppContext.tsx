"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/utils/supabase";
import type { UserRole } from "@/types";

export type Session = {
  id?: string;
  role: UserRole;
  name: string;
  email?: string;
  avatar: string;
  sellerId?: number;
};

interface AppContextProps {
  session: Session | null;
  login: (
    role: UserRole,
    sellerId?: number,
    userData?: { id?: string; name?: string; email?: string; avatar?: string },
  ) => void;
  logout: () => void;
  urgentActive: number;
}

const AppContext = createContext<AppContextProps>({} as AppContextProps);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [urgentActive, setUrgentActive] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedSession = localStorage.getItem("@pnzfrios:session");
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        // Garante retrocompatibilidade caso exista sessão antiga salva no navegador
        setSession({
          ...parsed,
          name:
            parsed.name || (parsed.role === "gestor" ? "Gestor" : "Vendedor"),
          avatar: parsed.avatar || (parsed.role === "gestor" ? "GS" : "VD"),
        });
      } catch (error) {
        localStorage.removeItem("@pnzfrios:session");
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (session?.role === "gestor") {
      const fetchUrgent = async () => {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("priority", "Urgente")
          .neq("status", "entregue")
          .neq("status", "cancelado");
        setUrgentActive(count || 0);
      };
      fetchUrgent();
    }
  }, [session]);

  function login(
    role: UserRole,
    sellerId?: number,
    userData?: { id?: string; name?: string; email?: string; avatar?: string },
  ) {
    const defaultName = role === "gestor" ? "Gestor" : "Vendedor";
    const fullName = userData?.name || defaultName;
    const initials =
      userData?.avatar ||
      fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

    const newSession: Session = {
      id: userData?.id,
      role,
      sellerId,
      name: fullName,
      email: userData?.email,
      avatar: initials,
    };

    setSession(newSession);
    localStorage.setItem("@pnzfrios:session", JSON.stringify(newSession));
  }

  function logout() {
    setSession(null);
    localStorage.removeItem("@pnzfrios:session");
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#1e4023]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ session, login, logout, urgentActive }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
