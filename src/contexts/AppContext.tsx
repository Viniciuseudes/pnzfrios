"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/utils/supabase";

type UserRole = "gestor" | "vendedor";

type Session = {
  role: UserRole;
  sellerId?: number;
};

interface AppContextProps {
  session: Session | null;
  login: (role: UserRole, sellerId?: number) => void;
  logout: () => void;
  urgentActive: number;
}

const AppContext = createContext<AppContextProps>({} as AppContextProps);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [urgentActive, setUrgentActive] = useState(0);

  // Flag essencial para evitar que a tela do login "pisque" antes de ler o armazenamento
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 1. Ao carregar o App, varre o armazenamento interno do celular/navegador
    const storedSession = localStorage.getItem("@pnzfrios:session");

    if (storedSession) {
      try {
        setSession(JSON.parse(storedSession));
      } catch (error) {
        localStorage.removeItem("@pnzfrios:session"); // Limpa se os dados estiverem corrompidos
      }
    }

    // Libera a renderização da tela
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    // 2. Mantém a contagem de pedidos urgentes atualizada no menu do Admin
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

  function login(role: UserRole, sellerId?: number) {
    const newSession = { role, sellerId };
    setSession(newSession);

    // Grava a sessão permanentemente na máquina do usuário
    localStorage.setItem("@pnzfrios:session", JSON.stringify(newSession));
  }

  function logout() {
    setSession(null);

    // Destrói o "carimbo" quando o usuário escolhe encerrar a sessão
    localStorage.removeItem("@pnzfrios:session");
  }

  // Segura a tela em branco por milissegundos enquanto lê o cache do celular
  // Isso evita que o usuário veja a tela de login piscar antes de ir pro Dashboard
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
