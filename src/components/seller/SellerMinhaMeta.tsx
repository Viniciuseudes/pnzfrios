import { Trophy, TrendingUp, Target, Zap, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CircleGauge } from "@/components/seller/CircleGauge";
import { sellers } from "@/data/sellers";
import { fmt } from "@/utils/format";
import type { Seller } from "@/types";

export function SellerMinhaMeta({ seller }: { seller: Seller }) {
  const pct = (seller.achieved / seller.target) * 100;
  const sellerRank = [...sellers].sort((a, b) => b.achieved - a.achieved).findIndex(s => s.id === seller.id) + 1;
  const tier = pct >= 100
    ? { label: "Campeão!", icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" }
    : pct >= 80
    ? { label: "Quase Lá!", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" }
    : pct >= 50
    ? { label: "No Caminho", icon: Target, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" }
    : { label: "Precisa Acelerar!", icon: Zap, color: "text-red-600", bg: "bg-red-50 border-red-200" };

  const monthlyData = [
    { mes: "Abr", atingido: seller.target * 0.72, meta: seller.target },
    { mes: "Mai", atingido: seller.target * 0.88, meta: seller.target },
    { mes: "Jun", atingido: seller.target * 0.95, meta: seller.target },
    { mes: "Jul", atingido: seller.achieved, meta: seller.target },
  ];
  const sellerColors = ["bg-amber-600", "bg-[#1e4023]", "bg-[#2d6a3a]", "bg-[#c8921c]"];

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Minha Meta</h2>
        <p className="text-xs text-muted-foreground">Julho/2025 · Acompanhe seu desempenho</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-4 shadow-sm">
        <CircleGauge pct={pct} size={180} />
        <span className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${tier.bg} ${tier.color}`}>
          <tier.icon className="w-4 h-4" />{tier.label}
        </span>
        <div className="w-full grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Vendido", value: fmt(seller.achieved) },
            { label: "Meta", value: fmt(seller.target) },
            { label: "Faltam", value: fmt(Math.max(seller.target - seller.achieved, 0)) },
          ].map(s => (
            <div key={s.label} className="bg-secondary/40 rounded-xl p-2.5">
              <p className="text-xs font-bold text-foreground truncate">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-3">Evolução Mensal</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,64,35,0.07)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#5e7562" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#5e7562" }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e2ece3", fontSize: 11 }} />
            <Bar dataKey="meta" name="Meta" fill="#d6e8d8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="atingido" name="Atingido" fill="#1e4023" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#c8921c]" /> Ranking da Equipe
        </p>
        <div className="space-y-3">
          {[...sellers].sort((a, b) => b.achieved - a.achieved).map((s, i) => {
            const isMe = s.id === seller.id;
            const sp = (s.achieved / s.target) * 100;
            return (
              <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${isMe ? "bg-[#1e4023]/10 border border-[#1e4023]/20" : ""}`}>
                <span className={`w-6 text-center text-sm font-black flex-shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-amber-700/60"}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}°`}
                </span>
                <div className={`w-8 h-8 rounded-full ${sellerColors[i % sellerColors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{s.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className={`text-xs font-semibold truncate ${isMe ? "text-[#1e4023]" : "text-foreground"}`}>{s.name}{isMe && " (você)"}</p>
                    <p className="text-xs font-black text-[#1e4023] flex-shrink-0 ml-2">{sp.toFixed(0)}%</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                    <div className={`h-full rounded-full ${isMe ? "bg-[#c8921c]" : "bg-[#1e4023]/50"}`} style={{ width: `${Math.min(sp, 100)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
