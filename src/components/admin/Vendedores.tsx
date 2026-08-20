import { Plus, MapPin, Star, ShoppingCart, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { sellers } from "@/data/sellers";
import { fmt } from "@/utils/format";

export function Vendedores() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Equipe de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Desempenho individual — Julho/2025</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors shadow-sm flex-shrink-0">
          <Plus className="w-4 h-4" /> Adicionar Vendedor
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Comparativo de Vendas da Equipe</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={sellers.map(s => ({ name: s.name.split(" ")[0], atingido: s.achieved, meta: s.target }))} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,54,107,0.07)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7c99" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7c99" }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e4eaf3", fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="meta" name="Meta" fill="#d6e8d8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="atingido" name="Atingido" fill="#1e4023" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sellers.map(s => {
          const pct = Math.min((s.achieved / s.target) * 100, 100);
          const over = s.achieved > s.target;
          const colors = ["bg-amber-600", "bg-[#1e4023]", "bg-[#2d6a3a]", "bg-[#c8921c]"];
          return (
            <div key={s.id} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full ${colors[(s.id - 1) % colors.length]} flex items-center justify-center text-white font-bold text-sm`}>
                    {s.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{s.region}</p>
                  </div>
                </div>
                {over && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-emerald-500" /> Meta batida
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendido</span>
                  <span className="font-semibold text-foreground">{fmt(s.achieved)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meta</span>
                  <span className="text-muted-foreground">{fmt(s.target)}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Progresso do mês</span>
                  <span className={`font-bold ${over ? "text-emerald-600" : pct >= 70 ? "text-blue-600" : "text-amber-600"}`}>{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${over ? "bg-[#2d6a3a]" : pct >= 70 ? "bg-[#1e4023]" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{s.orders} pedidos</span>
                <button className="flex items-center gap-1 text-primary hover:underline font-medium">
                  Ver detalhes <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
