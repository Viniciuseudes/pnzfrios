import { Package, TrendingUp, MapPin, Clock, Zap } from "lucide-react";
import { CircleGauge } from "@/components/seller/CircleGauge";
import { initialRoutes } from "@/data/routes";
import { fmt } from "@/utils/format";
import type { Seller, KanbanOrder } from "@/types";

export function SellerHome({ seller, orders }: { seller: Seller; orders: KanbanOrder[] }) {
  const pct = (seller.achieved / seller.target) * 100;
  const myOrders = orders.filter(o => o.sellerId === seller.id);
  const activeOrders = myOrders.filter(o => !["entregue", "cancelado"].includes(o.status));
  const myRoute = initialRoutes.find(r => r.sellerId === seller.id && r.status === "Ativa");
  const todayStops = myRoute?.stops ?? [];
  const visitedToday = todayStops.filter(s => s.status === "Visitado").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-5 pb-4">
      <div className="bg-gradient-to-br from-[#1e4023] to-[#2d6a3a] rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-6 -translate-x-6" />
        <div className="relative">
          <p className="text-white/70 text-sm">{greeting},</p>
          <p className="text-xl font-black leading-tight">{seller.name.split(" ")[0]} 👋</p>
          <p className="text-white/60 text-xs mt-1">{seller.region}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-5 shadow-sm">
        <CircleGauge pct={pct} size={120} />
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Vendido</p>
            <p className="text-lg font-black text-[#1e4023]">{fmt(seller.achieved)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="text-sm font-bold text-foreground">{fmt(seller.target)}</p>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1e4023] to-[#2d6a3a] transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground">Julho/2025</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Package, label: "Pedidos Ativos", value: activeOrders.length, color: "text-blue-600", bg: "bg-blue-50" },
          { icon: TrendingUp, label: "Total Pedidos", value: myOrders.length, color: "text-[#1e4023]", bg: "bg-emerald-50" },
        ].map(k => (
          <div key={k.label} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-black text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {myRoute && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#1e4023] to-[#c8921c]" />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm font-bold text-foreground">Rota de Hoje</p>
                  {myRoute.priority === "Urgente" && <Zap className="w-3.5 h-3.5 text-red-500" />}
                </div>
                <p className="text-xs text-muted-foreground">{myRoute.name}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{myRoute.status}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{myRoute.startTime}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{myRoute.stops.length} paradas</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-[#1e4023] transition-all duration-700" style={{ width: `${todayStops.length > 0 ? (visitedToday / todayStops.length) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{visitedToday}/{todayStops.length} paradas visitadas</p>
          </div>
        </div>
      )}

      {activeOrders.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-3">Pedidos Ativos</p>
          <div className="space-y-2">
            {activeOrders.slice(0, 3).map(o => (
              <div key={o.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {o.priority === "Urgente" && <Zap className="w-3 h-3 text-red-500 flex-shrink-0" />}
                  <span className="font-medium text-foreground">{o.orderNumber} · {o.clientName}</span>
                </div>
                <span className="text-muted-foreground font-mono">{fmt(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
