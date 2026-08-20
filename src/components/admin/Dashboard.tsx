"use client";
import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  ShoppingCart,
  Users,
  AlertTriangle,
  BarChart2,
  Star,
  Filter,
  Calendar as CalIcon,
  Package,
  User2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { Avatar } from "@/components/ui/Avatar";
import { supabase } from "@/utils/supabase";
import { fmt } from "@/utils/format";
import type { Client, Product, Seller } from "@/types";

type ChartData = { day: string; vendas: number };
type TopProduct = { name: string; revenue: number };
type TopSeller = {
  id: number;
  name: string;
  avatar: string;
  achieved: number;
  orders: number;
  region: string;
};

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Listas de apoio para os filtros
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Estados dos Filtros
  const [dateRange, setDateRange] = useState<
    "7" | "15" | "30" | "all" | "custom"
  >("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");

  // Métricas
  const [lowStockCount, setLowStockCount] = useState(0);
  const [activeClientsCount, setActiveClientsCount] = useState(0);
  const [totalRev, setTotalRev] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);

  // 1. Carrega os metadados (Clientes e Produtos) apenas uma vez
  useEffect(() => {
    async function fetchMetadata() {
      const [
        { data: cData },
        { data: pData },
        { count: stockCount },
        { count: clientsCount },
      ] = await Promise.all([
        supabase.from("clients").select("id, name").eq("status", "Ativo"),
        supabase.from("products").select("id, name"),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .lt("stock", 15),
        supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("status", "Ativo"),
      ]);

      if (cData) setClients(cData as Client[]);
      if (pData) setProducts(pData as Product[]);
      if (stockCount !== null) setLowStockCount(stockCount);
      if (clientsCount !== null) setActiveClientsCount(clientsCount);
    }
    fetchMetadata();
  }, []);

  // 2. Busca e processa os dados do Dashboard sempre que os filtros mudam
  useEffect(() => {
    async function fetchDashboardData() {
      if (!loading) setIsRefreshing(true);

      // A) Constrói a Query de Datas
      let query = supabase
        .from("orders")
        .select(
          `
          id, created_at, status, client_id, seller_id,
          order_items (product_id, qty, price, products(name)),
          sellers (name, avatar, region)
        `,
        )
        .neq("status", "cancelado");

      if (dateRange !== "all" && dateRange !== "custom") {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - parseInt(dateRange));
        query = query.gte("created_at", dateLimit.toISOString());
      } else if (dateRange === "custom" && customStart && customEnd) {
        query = query
          .gte("created_at", new Date(customStart).toISOString())
          .lte("created_at", new Date(customEnd + "T23:59:59").toISOString());
      }

      const { data: ordersData } = await query;

      if (ordersData) {
        let revenue = 0;
        let validOrdersCount = 0;
        const salesByDay: Record<string, number> = {};
        const productRevenue: Record<string, number> = {};
        const sellersRevenue: Record<number, TopSeller> = {};

        // B) Processamento e Filtragem Cruzada na Memória (Alta Performance)
        ordersData.forEach((order: any) => {
          // Filtro de Cliente
          if (
            selectedClient !== "all" &&
            order.client_id.toString() !== selectedClient
          )
            return;

          let orderRevenue = 0;
          let hasMatchingProduct = false;

          order.order_items.forEach((item: any) => {
            // Filtro de Produto
            if (
              selectedProduct !== "all" &&
              item.product_id.toString() !== selectedProduct
            )
              return;

            hasMatchingProduct = true;
            const itemTotal = item.qty * item.price;
            orderRevenue += itemTotal;

            // Agregação de Produtos
            const pName = item.products?.name || "Produto Excluído";
            productRevenue[pName] = (productRevenue[pName] || 0) + itemTotal;
          });

          // Se passou pelos filtros, agrega os totais
          if (selectedProduct === "all" || hasMatchingProduct) {
            revenue += orderRevenue;
            validOrdersCount++;

            // Agregação por Dia (Gráfico)
            const dateObj = new Date(order.created_at);
            const dayStr = `${dateObj.getDate().toString().padStart(2, "0")}/${(dateObj.getMonth() + 1).toString().padStart(2, "0")}`;
            salesByDay[dayStr] = (salesByDay[dayStr] || 0) + orderRevenue;

            // Agregação por Vendedor
            const sId = order.seller_id;
            if (sId && order.sellers) {
              if (!sellersRevenue[sId]) {
                sellersRevenue[sId] = {
                  id: sId,
                  name: order.sellers.name,
                  avatar: order.sellers.avatar,
                  region: order.sellers.region,
                  achieved: 0,
                  orders: 0,
                };
              }
              sellersRevenue[sId].achieved += orderRevenue;
              sellersRevenue[sId].orders += 1;
            }
          }
        });

        setTotalRev(revenue);
        setTotalOrders(validOrdersCount);

        // C) Formatação para os Gráficos
        const chartArr = Object.keys(salesByDay).map((day) => ({
          day,
          vendas: salesByDay[day],
        }));
        // Ordena por data aproximada
        setChartData(
          chartArr.length > 0 ? chartArr : [{ day: "Sem dados", vendas: 0 }],
        );

        setTopProducts(
          Object.keys(productRevenue)
            .map((name) => ({ name, revenue: productRevenue[name] }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5),
        );

        setTopSellers(
          Object.values(sellersRevenue)
            .sort((a, b) => b.achieved - a.achieved)
            .slice(0, 3),
        );
      }

      setLoading(false);
      setIsRefreshing(false);
    }

    fetchDashboardData();
  }, [dateRange, customStart, customEnd, selectedClient, selectedProduct]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão analítica e cruzamento de dados
          </p>
        </div>
      </div>

      {/* PAINEL DE FILTROS (MOBILE FIRST) */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Filtros Avançados
          </h3>
          {isRefreshing && (
            <div className="ml-auto animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Período */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CalIcon className="w-3.5 h-3.5" /> Período
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="all">Todo o período</option>
              <option value="custom">Data Personalizada</option>
            </select>
          </div>

          {/* Datas Customizadas (Aparece condicionalmente) */}
          {dateRange === "custom" && (
            <div className="space-y-1.5 flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Início
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-2 py-2.5 rounded-lg border border-border bg-input-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Fim
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-2 py-2.5 rounded-lg border border-border bg-input-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Cliente */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User2 className="w-3.5 h-3.5" /> Cliente
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              <option value="all">Todos os Clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Produto */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Produto
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              <option value="all">Todos os Produtos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CARDS DE KPI (Responsivo: 1 col no cel, 2 no tablet, 4 no desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Faturamento"
          value={fmt(totalRev)}
          change="Filtrado"
          changeType="up"
          color="bg-[#1e4023]"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Pedidos Validados"
          value={totalOrders.toString()}
          change="Filtrado"
          changeType="up"
          color="bg-[#2d6a3a]"
        />
        <KpiCard
          icon={Users}
          label="Clientes Ativos"
          value={activeClientsCount.toString()}
          change="Na base total"
          changeType="up"
          color="bg-[#c8921c]"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Estoque Crítico"
          value={`${lowStockCount} itens`}
          change="Reposição urgente"
          changeType="warn"
          color="bg-amber-500"
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Curva de Faturamento
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              R$ processados conforme filtro aplicado
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1e4023] inline-block" />
            Faturamento
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e4023" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#1e4023" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(26,54,107,0.07)"
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "#6b7c99" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b7c99" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v: number) => [fmt(v), "Faturamento"]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e4eaf3",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="vendas"
              stroke="#1e4023"
              strokeWidth={2}
              fill="url(#colorVendas)"
              dot={{ r: 3, fill: "#1e4023" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Top Produtos no Período
            </h3>
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
          </div>
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhuma venda do produto/cliente selecionado.
            </p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-secondary text-xs font-bold text-primary flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground truncate">
                        {p.name}
                      </span>
                      <span className="text-xs font-semibold text-primary ml-2 flex-shrink-0">
                        {fmt(p.revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1e4023] rounded-full"
                        style={{
                          width: `${(p.revenue / topProducts[0].revenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Performance da Equipe
            </h3>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          {topSellers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum vendedor atrelado aos filtros.
            </p>
          ) : (
            <div className="space-y-3">
              {topSellers.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      initials={s.avatar}
                      color={
                        ["bg-amber-600", "bg-[#1e4023]", "bg-[#2d6a3a]"][i] ||
                        "bg-gray-500"
                      }
                    />
                    {i === 0 && (
                      <Star className="w-3 h-3 text-amber-400 absolute -top-1 -right-1 fill-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        {s.name}
                      </span>
                      <span className="text-xs font-bold text-emerald-600">
                        {fmt(s.achieved)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.orders} pedidos • {s.region}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
