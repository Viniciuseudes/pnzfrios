"use client";
import { useState, useEffect } from "react";
import { Package, TrendingUp, MapPin, Clock, Zap } from "lucide-react";
import { CircleGauge } from "@/components/seller/CircleGauge";
import { supabase } from "@/utils/supabase";
import { fmt } from "@/utils/format";
import { useApp } from "@/contexts/AppContext";
import type { Seller } from "@/types";

export function SellerHome() {
  const { session } = useApp();
  const [seller, setSeller] = useState<Seller | null>(null);

  // Estados para as métricas da Home
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      if (!session?.sellerId) return;

      // 1. Busca os dados atualizados da Meta do Vendedor
      const { data: sData } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", session.sellerId)
        .single();

      if (sData) setSeller(sData as Seller);

      // 2. Busca Pedidos (Para contagem e exibir os últimos ativos)
      const { data: ordersData } = await supabase
        .from("orders")
        .select(
          `
          id, order_number, status, priority, created_at,
          clients(name),
          order_items(qty, price)
        `,
        )
        .eq("seller_id", session.sellerId)
        .neq("status", "cancelado")
        .order("created_at", { ascending: false });

      if (ordersData) {
        setTotalOrdersCount(ordersData.length);

        const ativos = ordersData.filter((o) => o.status !== "entregue");
        setActiveOrdersCount(ativos.length);

        // Mapeia os 3 últimos pedidos ativos para a listagem rápida
        const formattedRecents = ativos.slice(0, 3).map((o: any) => {
          const total = o.order_items.reduce(
            (acc: number, item: any) => acc + item.qty * item.price,
            0,
          );
          return {
            id: o.id,
            orderNumber: o.order_number,
            clientName: o.clients?.name || "Cliente Excluído",
            priority: o.priority,
            total,
          };
        });
        setRecentOrders(formattedRecents);
      }

      // 3. Busca a Rota Ativa de hoje
      const { data: routeData } = await supabase
        .from("routes")
        .select(
          `
          name, start_time, status, priority,
          route_stops(status)
        `,
        )
        .eq("seller_id", session.sellerId)
        .eq("status", "Ativa")
        .limit(1)
        .single();

      if (routeData) {
        setActiveRoute(routeData);
      }

      setLoading(false);
    }

    loadHomeData();
  }, [session]);

  if (loading || !seller) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pct = seller.target > 0 ? (seller.achieved / seller.target) * 100 : 0;
  const todayStops = activeRoute?.route_stops || [];
  const visitedToday = todayStops.filter(
    (s: any) => s.status === "Visitado",
  ).length;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-5 pb-4">
      {/* Header com Saudação */}
      <div className="bg-gradient-to-br from-[#1e4023] to-[#2d6a3a] rounded-2xl p-5 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-6 -translate-x-6" />
        <div className="relative">
          <p className="text-white/70 text-sm">{greeting},</p>
          <p className="text-xl font-black leading-tight">
            {seller.name.split(" ")[0]} 👋
          </p>
          <p className="text-white/60 text-xs mt-1">{seller.region}</p>
        </div>
      </div>

      {/* Card da Meta */}
      <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-5 shadow-sm">
        <CircleGauge pct={pct} size={120} />
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Vendido</p>
            <p className="text-lg font-black text-[#1e4023]">
              {fmt(seller.achieved)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="text-sm font-bold text-foreground">
              {fmt(seller.target)}
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1e4023] to-[#2d6a3a] transition-all duration-700"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Progresso Mensal</p>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: Package,
            label: "Pedidos Ativos",
            value: activeOrdersCount,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: TrendingUp,
            label: "Total Pedidos",
            value: totalOrdersCount,
            color: "text-[#1e4023]",
            bg: "bg-emerald-50",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="bg-card rounded-2xl border border-border p-4 shadow-sm"
          >
            <div
              className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center mb-3`}
            >
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-black text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Rota Ativa */}
      {activeRoute && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#1e4023] to-[#c8921c]" />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm font-bold text-foreground">
                    Rota de Hoje
                  </p>
                  {activeRoute.priority === "Urgente" && (
                    <Zap className="w-3.5 h-3.5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeRoute.name}
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {activeRoute.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {activeRoute.start_time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {todayStops.length} paradas
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1e4023] transition-all duration-700"
                style={{
                  width: `${todayStops.length > 0 ? (visitedToday / todayStops.length) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {visitedToday}/{todayStops.length} paradas visitadas
            </p>
          </div>
        </div>
      )}

      {/* Pedidos Recentes */}
      {recentOrders.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-3">
            Meus Pedidos Recentes
          </p>
          <div className="space-y-3">
            {recentOrders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between text-xs border-b border-border/50 last:border-0 pb-2 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  {o.priority === "Urgente" && (
                    <Zap className="w-3 h-3 text-red-500 flex-shrink-0" />
                  )}
                  <span className="font-medium text-foreground truncate max-w-[150px]">
                    {o.orderNumber} • {o.clientName}
                  </span>
                </div>
                <span className="text-muted-foreground font-bold">
                  {fmt(o.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
