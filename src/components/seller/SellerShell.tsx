"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Navigation,
  Target,
  ShoppingCart,
  LogOut,
  ClipboardList,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";

const SELLER_NAV = [
  { href: "/seller/dashboard", label: "Início", icon: Home },
  { href: "/seller/vender", label: "Vender", icon: ShoppingCart },
  { href: "/seller/rotas", label: "Rotas", icon: Navigation },
  { href: "/seller/meta", label: "Meta", icon: Target },
];

export function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useApp();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="w-full h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Área Principal com Scroll Independente */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-safe pb-24 custom-scrollbar">
        <div className="px-4 py-4 max-w-7xl mx-auto w-full">{children}</div>
      </div>

      {/* Menu Inferior Mobile-First */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-20 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {SELLER_NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-1 transition-colors ${
              isActive(n.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <n.icon
              className={`w-5 h-5 transition-transform ${isActive(n.href) ? "scale-110" : ""}`}
            />
            <span
              className={`text-[10px] font-semibold ${isActive(n.href) ? "text-primary" : ""}`}
            >
              {n.label}
            </span>
            {isActive(n.href) && (
              <div className="absolute top-0 w-8 h-0.5 rounded-b-full bg-primary" />
            )}
          </Link>
        ))}
      </nav>

      {/* Botão de Sair Superior */}
      <div className="fixed top-4 right-4 z-30 pt-safe">
        <button
          onClick={handleLogout}
          className="text-xs font-medium text-destructive bg-red-50 border border-red-100 px-3 py-1.5 rounded-full shadow-sm hover:bg-red-100 transition-colors backdrop-blur-md flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </div>
    </div>
  );
}
