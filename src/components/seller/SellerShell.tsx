"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ShoppingBag, Route, Target, ClipboardList } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { sellers } from "@/data/sellers";

const SELLER_NAV: { href: string; label: string; icon: React.ElementType }[] = [
  { href: "/seller/home", label: "Início", icon: Home },
  { href: "/seller/catalogo", label: "Catálogo", icon: ShoppingBag },
  { href: "/seller/rotas", label: "Rotas", icon: Route },
  { href: "/seller/meta", label: "Meta", icon: Target },
  { href: "/seller/pedidos", label: "Pedidos", icon: ClipboardList },
];

export function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useApp();
  const seller = session?.sellerId ? sellers.find(s => s.id === session.sellerId) : null;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (!seller) return null;

  return (
    <div className="w-full min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-4 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-20">
        {SELLER_NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-colors ${isActive(n.href) ? "text-[#1e4023]" : "text-muted-foreground hover:text-foreground"}`}
          >
            <n.icon className={`w-5 h-5 transition-transform ${isActive(n.href) ? "scale-110" : ""}`} />
            <span className={`text-[9px] font-semibold ${isActive(n.href) ? "text-[#1e4023]" : ""}`}>{n.label}</span>
            {isActive(n.href) && <div className="w-4 h-0.5 rounded-full bg-[#1e4023]" />}
          </Link>
        ))}
      </nav>

      <div className="fixed top-3 right-4 z-30">
        <button
          onClick={handleLogout}
          className="text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-full shadow-sm hover:bg-secondary transition-colors"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
