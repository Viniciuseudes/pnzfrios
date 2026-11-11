"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  UserCheck,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  Route,
  Layers,
  Clock,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/utils/supabase";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const logoImg = "/logo.png";

const navItems: { href: string; label: string; icon: React.ElementType }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/produtos", label: "Produtos / Estoque", icon: Package },
  { href: "/admin/vendedores", label: "Vendedores", icon: UserCheck },
  { href: "/admin/rotas", label: "Rotas Inteligentes", icon: Route },
  { href: "/admin/ciclo", label: "Ciclo de Pedidos", icon: Layers },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, urgentActive } = useApp();

  usePushNotifications();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  const gestorName = session?.name || "Gestor";
  const gestorAvatar = session?.avatar || "GS";

  useEffect(() => {
    async function fetchLowStock() {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .lt("stock", 15);
      if (count !== null) setLowStockCount(count);
    }
    fetchLowStock();
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div
      className="flex h-screen bg-background overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-amber-600/40">
            <ImageWithFallback
              src={logoImg}
              alt="PNZ Frios"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">
              PNZ Frios
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 leading-tight">
              Sistema de Gestão
            </p>
          </div>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest px-3 mb-3">
            Menu Principal
          </p>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                isActive(href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-md"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
              {href === "/admin/produtos" && lowStockCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {lowStockCount}
                </span>
              )}
              {href === "/admin/ciclo" && urgentActive > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {urgentActive}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#c8921c] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {gestorAvatar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {gestorName}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50">
                Gestor Administrativo
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="text-sidebar-foreground/50 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          <div className="relative flex-1 max-w-sm hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Busca rápida..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {lowStockCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">
                      Notificações Operacionais
                    </p>
                  </div>
                  <div className="divide-y divide-border max-h-72 overflow-y-auto">
                    {lowStockCount > 0 ? (
                      <div className="flex gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-amber-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-snug">
                            Atenção: {lowStockCount} produto(s) com estoque
                            crítico!
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Agora
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Nenhum alerta pendente no momento.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#1e4023] flex items-center justify-center text-white text-xs font-bold">
                  {gestorAvatar}
                </div>
                <span className="hidden sm:block text-sm font-medium text-foreground">
                  {gestorName.split(" ")[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
                    <p className="text-xs font-bold text-foreground truncate">
                      {gestorName}
                    </p>
                    {session?.email && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {session.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
