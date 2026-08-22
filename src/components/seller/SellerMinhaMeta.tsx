"use client";
import { useState, useEffect } from "react";
import {
  Target,
  TrendingUp,
  Trophy,
  AlertCircle,
  DollarSign,
  Calendar,
  Filter,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useApp } from "@/contexts/AppContext";
import { fmt } from "@/utils/format";
import type { Seller } from "@/types";

export function SellerMinhaMeta() {
  const { session } = useApp();
  const [seller, setSeller] = useState<Seller | null>(null);

  // Estados de Filtro de Data
  const [dateFilter, setDateFilter] = useState("current_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [realAchieved, setRealAchieved] = useState(0);
  const [realCommission, setRealCommission] = useState(0);
  const [validOrdersCount, setValidOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchMetaAndSales() {
    if (!session?.sellerId) return;
    setLoading(true);

    const { data: sellerData } = await supabase
      .from("sellers")
      .select("*")
      .eq("id", session.sellerId)
      .single();
    if (sellerData) setSeller(sellerData as Seller);

    // LÓGICA SÊNIOR: Construção das datas de filtro
    let start = new Date();
    let end = new Date();

    if (dateFilter === "current_month") {
      start = new Date(start.getFullYear(), start.getMonth(), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateFilter === "last_month") {
      start = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      end = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59);
    } else if (dateFilter === "custom" && startDate && endDate) {
      start = new Date(startDate + "T00:00:00");
      end = new Date(endDate + "T23:59:59");
    } else {
      start = new Date(start.getFullYear(), start.getMonth(), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    }

    const { data: ordersData } = await supabase
      .from("orders")
      .select(
        `id, status, order_items (qty, price, products (commission_type, commission_value))`,
      )
      .eq("seller_id", session.sellerId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelado");

    if (ordersData) {
      let achieved = 0;
      let commission = 0;
      let ordersCount = 0;

      ordersData.forEach((order: any) => {
        ordersCount++;
        order.order_items.forEach((item: any) => {
          const itemTotal = item.qty * item.price;
          achieved += itemTotal;
          const cType = item.products?.commission_type || "percentage";
          const cVal = Number(item.products?.commission_value) || 0;

          if (cType === "percentage") commission += itemTotal * (cVal / 100);
          else if (cType === "fixed") commission += item.qty * cVal;
        });
      });

      setRealAchieved(achieved);
      setRealCommission(commission);
      setValidOrdersCount(ordersCount);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMetaAndSales();
    if (!session?.sellerId) return;

    const channel = supabase
      .channel("seller_meta")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${session.sellerId}`,
        },
        () => {
          fetchMetaAndSales();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, dateFilter, startDate, endDate]); // Refaz a busca se o filtro mudar

  if (!seller && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <AlertCircle className="w-8 h-8 opacity-50" />
        <p className="text-sm">Dados de meta não encontrados.</p>
      </div>
    );
  }

  const pct = seller?.target
    ? Math.min((realAchieved / seller.target) * 100, 100)
    : 0;
  const isTargetMet = seller?.target ? realAchieved >= seller.target : false;
  const remaining = seller?.target
    ? Math.max(seller.target - realAchieved, 0)
    : 0;

  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysLeft = lastDay.getDate() - today.getDate();

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Minha Meta</h2>
        <p className="text-xs text-muted-foreground">
          Acompanhe seus resultados por período
        </p>
      </div>

      {/* BARRA DE FILTRO */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Filter className="w-4 h-4" /> Filtro:
        </div>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="current_month">Mês Atual</option>
          <option value="last_month">Mês Anterior</option>
          <option value="custom">Período Personalizado</option>
        </select>
        {dateFilter === "custom" && (
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-2 rounded-lg bg-input-background border border-border text-xs"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-2 rounded-lg bg-input-background border border-border text-xs"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
            <div
              className={`p-6 text-white relative overflow-hidden transition-colors duration-500 ${isTargetMet ? "bg-emerald-600" : "bg-[#1e4023]"}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-10 translate-x-10" />
              <div className="flex items-center justify-between mb-6 relative">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    {isTargetMet ? (
                      <Trophy className="w-5 h-5 text-yellow-300" />
                    ) : (
                      <Target className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white/80 text-xs font-medium uppercase tracking-wider">
                      {dateFilter === "current_month"
                        ? "Status do Mês"
                        : "Fechamento do Período"}
                    </p>
                    <p className="text-sm font-bold">
                      {isTargetMet ? "Meta Batida! 🎉" : "Abaixo da Meta"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black">{pct.toFixed(0)}%</p>
                </div>
              </div>

              <div className="space-y-2 relative">
                <div className="flex justify-between text-xs text-white/80 font-medium">
                  <span>{fmt(realAchieved)}</span>
                  <span>{fmt(seller?.target || 0)}</span>
                </div>
                <div className="h-3 rounded-full bg-black/20 overflow-hidden backdrop-blur-sm p-0.5">
                  <div
                    className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {!isTargetMet && dateFilter === "current_month" && (
                  <p className="text-center text-[10px] text-white/70 mt-2 font-medium">
                    Faltam {fmt(remaining)} para atingir a meta
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Comissão Líquida do Período
                  </p>
                  <p className="text-lg font-black text-foreground">
                    {fmt(realCommission)}
                  </p>
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500 opacity-60" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {dateFilter === "current_month" ? (
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-foreground">
                  {daysLeft}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">
                  Dias Restantes
                </p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-sm font-black text-foreground mt-2">
                  Mês Fechado
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">
                  Período Concluído
                </p>
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <Trophy className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-foreground">
                {validOrdersCount}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">
                Pedidos Validados
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
