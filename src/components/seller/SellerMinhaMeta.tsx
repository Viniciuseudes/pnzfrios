"use client";
import { useState, useEffect } from "react";
import {
  Target,
  TrendingUp,
  Trophy,
  AlertCircle,
  DollarSign,
  Calendar,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useApp } from "@/contexts/AppContext";
import { fmt } from "@/utils/format";
import type { Seller } from "@/types";

export function SellerMinhaMeta() {
  const { session } = useApp();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);

  // Consideramos uma comissão fictícia de 3% para gamificar a tela
  const COMMISSION_RATE = 0.03;

  useEffect(() => {
    async function fetchMeta() {
      if (!session?.sellerId) return;

      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", session.sellerId)
        .single();

      if (data && !error) {
        setSeller(data as Seller);
      }
      setLoading(false);
    }
    fetchMeta();
  }, [session]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4023]"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <AlertCircle className="w-8 h-8 opacity-50" />
        <p className="text-sm">Dados de meta não encontrados.</p>
      </div>
    );
  }

  const pct =
    seller.target > 0
      ? Math.min((seller.achieved / seller.target) * 100, 100)
      : 0;
  const isTargetMet = seller.achieved >= seller.target && seller.target > 0;
  const remaining = Math.max(seller.target - seller.achieved, 0);
  const estimatedCommission = seller.achieved * COMMISSION_RATE;

  // Dias restantes no mês (Lógica simples para gamificação)
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysLeft = lastDay.getDate() - today.getDate();

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Minha Meta</h2>
        <p className="text-xs text-muted-foreground">
          Acompanhe seu desempenho mensal
        </p>
      </div>

      {/* Card Principal de Progresso */}
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
                  Status Mensal
                </p>
                <p className="text-sm font-bold">
                  {isTargetMet ? "Meta Batida! 🎉" : "Em Progresso"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black">{pct.toFixed(0)}%</p>
            </div>
          </div>

          <div className="space-y-2 relative">
            <div className="flex justify-between text-xs text-white/80 font-medium">
              <span>{fmt(seller.achieved)}</span>
              <span>{fmt(seller.target)}</span>
            </div>
            <div className="h-3 rounded-full bg-black/20 overflow-hidden backdrop-blur-sm p-0.5">
              <div
                className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            {!isTargetMet && (
              <p className="text-center text-[10px] text-white/70 mt-2 font-medium">
                Faltam {fmt(remaining)} para atingir a meta
              </p>
            )}
          </div>
        </div>

        {/* Projeção de Comissão */}
        <div className="p-5 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Projeção de Comissão (3%)
              </p>
              <p className="text-lg font-black text-foreground">
                {fmt(estimatedCommission)}
              </p>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-muted-foreground opacity-30" />
        </div>
      </div>

      {/* Grid de Estatísticas Secundárias */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-foreground">{daysLeft}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">
            Dias Restantes
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <Trophy className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {seller.orders_count}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">
            Pedidos Feitos
          </p>
        </div>
      </div>

      <div className="bg-secondary/40 border border-border rounded-xl p-4 text-center mt-4">
        <p className="text-xs text-muted-foreground italic">
          "A disciplina é a ponte entre metas e realizações."
        </p>
      </div>
    </div>
  );
}
