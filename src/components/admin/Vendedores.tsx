"use client";
import { useState, useEffect } from "react";
import {
  Plus,
  MapPin,
  Star,
  ShoppingCart,
  ChevronRight,
  UserCheck,
  Settings,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { SellerModal } from "@/components/ui/SellerModal";
import { SellerHistoryModal } from "@/components/ui/SellerHistoryModal"; // <-- NOVO COMPONENTE
import { supabase } from "@/utils/supabase";
import { fmt } from "@/utils/format";
import type { Seller } from "@/types";

export function Vendedores() {
  const [dbSellers, setDbSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  // Controle de Modais
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

  async function fetchSellers() {
    setLoading(true);
    try {
      const { data: sellersData, error: sellersError } = await supabase
        .from("sellers")
        .select("*")
        .order("id", { ascending: true });

      if (sellersError) throw sellersError;

      const now = new Date();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          seller_id,
          status,
          order_items (qty, price)
        `,
        )
        .gte("created_at", startOfMonth)
        .neq("status", "cancelado")
        .neq("status", "aguardando_pagamento");

      if (ordersError) throw ordersError;

      const realTimeSellers = sellersData.map((seller: any) => {
        const myOrders = (ordersData || []).filter(
          (o: any) => o.seller_id === seller.id,
        );

        const totalAchieved = myOrders.reduce(
          (accOrder: number, order: any) => {
            const orderSum = order.order_items.reduce(
              (accItem: number, item: any) => accItem + item.qty * item.price,
              0,
            );
            return accOrder + orderSum;
          },
          0,
        );

        return {
          ...seller,
          achieved: totalAchieved,
          orders_count: myOrders.length,
        };
      });

      setDbSellers(realTimeSellers as Seller[]);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSellers();
  }, []);

  const chartData = dbSellers.map((s) => ({
    name: s.name.split(" ")[0],
    atingido: s.achieved,
    meta: s.target,
  }));

  return (
    <>
      {showEditModal && (
        <SellerModal
          seller={selectedSeller}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSeller(null);
          }}
          onSuccess={fetchSellers}
        />
      )}

      {showHistoryModal && selectedSeller && (
        <SellerHistoryModal
          seller={selectedSeller}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedSeller(null);
          }}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Equipe de Vendas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Desempenho individual e metas do mês atual
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedSeller(null);
              setShowEditModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors shadow-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Adicionar Vendedor
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : dbSellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 bg-card border border-border rounded-xl">
            <UserCheck className="w-10 h-10 opacity-20" />
            <p className="text-sm">Nenhum vendedor cadastrado ainda.</p>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Comparativo de Vendas da Equipe
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(30,64,35,0.07)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#5e7562" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#5e7562" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e2ece3",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: "10px" }}
                  />
                  <Bar
                    dataKey="meta"
                    name="Meta"
                    fill="#d6e8d8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                  <Bar
                    dataKey="atingido"
                    name="Atingido"
                    fill="#1e4023"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {dbSellers.map((s, index) => {
                const pct =
                  s.target > 0
                    ? Math.min((s.achieved / s.target) * 100, 100)
                    : 0;
                const over = s.achieved >= s.target && s.target > 0;
                const colors = [
                  "bg-amber-600",
                  "bg-[#1e4023]",
                  "bg-[#2d6a3a]",
                  "bg-[#c8921c]",
                ];
                const avatarColor = colors[index % colors.length];

                return (
                  <div
                    key={s.id}
                    className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-inner`}
                        >
                          {s.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {s.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {s.region}
                          </p>
                        </div>
                      </div>
                      {over && (
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-full">
                          <Star className="w-3 h-3 fill-emerald-500" /> Bateu a
                          Meta
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between items-center bg-secondary/30 p-2 rounded-lg">
                        <span className="text-muted-foreground text-xs">
                          Vendido
                        </span>
                        <span className="font-bold text-foreground">
                          {fmt(s.achieved)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2">
                        <span className="text-muted-foreground text-xs">
                          Meta Mensal
                        </span>
                        <span className="text-muted-foreground font-medium">
                          {fmt(s.target)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">
                          Progresso
                        </span>
                        <span
                          className={`font-black ${over ? "text-emerald-600" : pct >= 70 ? "text-blue-600" : "text-amber-600"}`}
                        >
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${over ? "bg-emerald-500" : pct >= 70 ? "bg-[#1e4023]" : "bg-amber-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        <ShoppingCart className="w-3.5 h-3.5" />{" "}
                        {s.orders_count} ordens
                      </span>

                      {/* OS DOIS NOVOS BOTÕES */}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            setSelectedSeller(s);
                            setShowEditModal(true);
                          }}
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSeller(s);
                            setShowHistoryModal(true);
                          }}
                          className="flex items-center gap-1 text-primary hover:text-[#c8921c] font-bold transition-colors"
                        >
                          Histórico <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
