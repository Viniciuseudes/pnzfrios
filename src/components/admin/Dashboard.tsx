import { DollarSign, ShoppingCart, Users, AlertTriangle, BarChart2, Star } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { Avatar } from "@/components/ui/Avatar";
import { salesData, topProducts } from "@/data/salesData";
import { products } from "@/data/products";
import { sellers } from "@/data/sellers";
import { fmt } from "@/utils/format";

export function Dashboard() {
  const totalRev = salesData.reduce((a, d) => a + d.vendas, 0);
  const totalOrders = salesData.reduce((a, d) => a + d.pedidos, 0);
  const lowStock = products.filter(p => p.stock < 15).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Resumo operacional — julho 2025</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Faturamento do Mês" value={fmt(totalRev)} change="+12,4% vs mês anterior" changeType="up" color="bg-[#1e4023]" />
        <KpiCard icon={ShoppingCart} label="Total de Pedidos" value={totalOrders.toString()} change="+3 hoje" changeType="up" color="bg-[#2d6a3a]" />
        <KpiCard icon={Users} label="Clientes Ativos" value="37" change="+2 esta semana" changeType="up" color="bg-[#c8921c]" />
        <KpiCard icon={AlertTriangle} label="Estoque Crítico" value={`${lowStock} itens`} change="Reposição urgente" changeType="warn" color="bg-amber-500" />
      </div>

      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Volume de Vendas — Últimos 30 Dias</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Faturamento diário em R$</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Vendas
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={salesData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e4023" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#1e4023" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,54,107,0.07)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#6b7c99" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7c99" }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [fmt(v), "Vendas"]} contentStyle={{ borderRadius: 8, border: "1px solid #e4eaf3", fontSize: 12 }} />
            <Area type="monotone" dataKey="vendas" stroke="#1e4023" strokeWidth={2} fill="url(#colorVendas)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Top 5 Produtos Mais Vendidos</h3>
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-secondary text-xs font-bold text-primary flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                    <span className="text-xs font-semibold text-primary ml-2 flex-shrink-0">{fmt(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#1e4023] rounded-full" style={{ width: `${(p.revenue / topProducts[0].revenue) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Top 3 Vendedores do Mês</h3>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-3">
            {[...sellers].sort((a, b) => b.achieved - a.achieved).slice(0, 3).map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar initials={s.avatar} color={["bg-amber-600", "bg-[#1e4023]", "bg-[#2d6a3a]"][i]} />
                  {i === 0 && <Star className="w-3 h-3 text-amber-400 absolute -top-1 -right-1 fill-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{s.name}</span>
                    <span className="text-xs font-bold text-emerald-600">{fmt(s.achieved)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.orders} pedidos · {s.region}</p>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">Mês de referência: Julho/2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
