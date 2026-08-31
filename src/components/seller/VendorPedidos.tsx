"use client";
import { useState, useEffect } from "react";
import {
  Clock,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Package,
  MapPin,
  Filter,
  Copy,
  CheckCircle2,
  Wallet,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { colFor, nextStatus, timeAgo } from "@/utils/kanban";
import { fmt } from "@/utils/format";
import type { KanbanOrder, OrderStatus } from "@/types";
import { OrderDetailModal } from "@/components/ui/OrderDetailModal";
import { supabase } from "@/utils/supabase";
import { useApp } from "@/contexts/AppContext";

const STATUS_FLOW: OrderStatus[] = ["novo", "separacao", "rota", "entregue"];

type VendorOrder = KanbanOrder & {
  paymentUrl?: string;
};

export function VendorPedidos() {
  const { session } = useApp();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [sellerName, setSellerName] = useState("Vendedor");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VendorOrder | null>(null);

  // Feedback visual de cópia do link
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ESTADOS DE FILTRO E BUSCA
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "todos">(
    "todos",
  );
  const [dateFilter, setDateFilter] = useState("current_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function fetchOrders() {
    if (!session?.sellerId) return;
    setLoading(true);

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

    const [{ data: sData }, { data: oData }] = await Promise.all([
      supabase
        .from("sellers")
        .select("name")
        .eq("id", session.sellerId)
        .single(),
      supabase
        .from("orders")
        .select(
          `
          id, order_number, status, priority, created_at, updated_at, notes, delivery_address, client_id, payment_url, 
          clients(name), sellers(name, avatar), order_items(product_id, qty, price, products(name)), order_history(status, changed_by, note, created_at)
        `,
        )
        .eq("seller_id", session.sellerId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false }),
    ]);

    if (sData) setSellerName(sData.name);

    if (oData) {
      const formatted: VendorOrder[] = oData.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        clientId: o.client_id,
        clientName: o.clients?.name || "Cliente Excluído",
        sellerId: session.sellerId!,
        sellerName: o.sellers?.name || "Desconhecido",
        sellerAvatar: o.sellers?.avatar || "VD",
        paymentUrl: o.payment_url,
        items: o.order_items.map((i: any) => ({
          productId: i.product_id,
          name: i.products?.name || "Produto Excluído",
          qty: i.qty,
          price: i.price,
        })),
        total: o.order_items.reduce(
          (acc: number, i: any) => acc + i.qty * i.price,
          0,
        ),
        priority: o.priority,
        status: o.status as OrderStatus,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        notes: o.notes || "",
        deliveryAddress: o.delivery_address || "",
        history: o.order_history.map((h: any) => ({
          status: h.status as OrderStatus,
          time: h.created_at,
          by: h.changed_by,
          note: h.note,
        })),
      }));
      setOrders(formatted);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
    if (!session?.sellerId) return;
    const channel = supabase
      .channel("seller_orders_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${session.sellerId}`,
        },
        () => {
          fetchOrders();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, dateFilter, startDate, endDate]);

  async function handleAdvance(id: string, note: string) {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const next = nextStatus(order.status);
    if (!next) return;

    await supabase
      .from("orders")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", id);

    await supabase
      .from("order_history")
      .insert([{ order_id: id, status: next, changed_by: sellerName, note }]);

    // --- GATILHO: AVISA O GESTOR QUANDO A ENTREGA FOR CONCLUÍDA NA RUA ---
    if (next === "entregue") {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000");
        await fetch(`${baseUrl}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: "admin", // Direcionado ao gestor financeiro/operacional
            title: "Entrega Concluida",
            body: `O pedido ${order.orderNumber} acaba de ser entregue pelo vendedor ${sellerName}.`,
            url: "/admin/ciclo", // Redireciona para o ciclo de pedidos do admin
          }),
        });
      } catch (e) {
        console.error("Erro ao notificar entrega", e);
      }
    }
    // --- FIM DO GATILHO ---
  }

  async function handleAddNote(id: string, note: string) {
    if (!note.trim()) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    await supabase
      .from("order_history")
      .insert([
        { order_id: id, status: order.status, changed_by: sellerName, note },
      ]);
    await supabase
      .from("orders")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  const handleCopyLink = (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // LÓGICA DE FILTRAGEM (A PENEIRA)
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "todos" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeOrders = filteredOrders.filter(
    (o) => o.status !== "entregue" && o.status !== "cancelado",
  );
  const doneOrders = filteredOrders.filter((o) => o.status === "entregue");

  // O Volume Financeiro agora reflete os filtros aplicados!
  const totalVolume = activeOrders.reduce((acc, o) => acc + o.total, 0);

  const STATUS_TABS = [
    { value: "todos", label: "Todos" },
    { value: "aguardando_pagamento", label: "Aguardando Pagamento" },
    { value: "novo", label: "Novos" },
    { value: "separacao", label: "Em Separação" },
    { value: "rota", label: "Em Rota" },
    { value: "entregue", label: "Finalizados" },
  ];

  return (
    <>
      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onAdvance={handleAdvance}
          onCancel={() => {}}
          onAddNote={handleAddNote}
          isAdmin={false}
        />
      )}

      <div className="space-y-5 pb-6">
        {/* NOVA BARRA DE CONTROLE INTELIGENTE */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Campo de Busca Universal */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente ou pedido (#1234)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Filtro de Data */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center border border-border">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="current_month">Mês Atual</option>
                <option value="last_month">Mês Anterior</option>
                <option value="custom">Período Personalizado</option>
              </select>
            </div>
          </div>

          {dateFilter === "custom" && (
            <div className="flex gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-xs text-foreground"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-xs text-foreground"
              />
            </div>
          )}

          {/* Pílulas de Status Roláveis */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value as any)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary border border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* WIDGET DE RESUMO PREMIUM */}
            <div className="bg-[#1e4023] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest mb-1">
                Volume {statusFilter !== "todos" ? "Filtrado" : "em Andamento"}
              </p>
              <h2 className="text-3xl font-black tracking-tight mb-5">
                {fmt(totalVolume)}
              </h2>
              <div className="flex gap-3">
                <div className="bg-black/20 px-4 py-3 rounded-xl flex-1 backdrop-blur-md border border-white/5">
                  <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
                    Pendentes
                  </p>
                  <p className="text-xl font-bold">{activeOrders.length}</p>
                </div>
                {statusFilter === "todos" && (
                  <div className="bg-black/20 px-4 py-3 rounded-xl flex-1 backdrop-blur-md border border-white/5">
                    <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
                      Finalizados
                    </p>
                    <p className="text-xl font-bold">{doneOrders.length}</p>
                  </div>
                )}
              </div>
            </div>

            {activeOrders.length === 0 && doneOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 bg-card border border-border rounded-2xl shadow-sm">
                <ClipboardList className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">
                  {searchTerm
                    ? "Nenhum pedido encontrado na busca"
                    : "Nenhum pedido neste filtro"}
                </p>
              </div>
            )}

            {/* LISTAGEM DE PEDIDOS ATIVOS */}
            {activeOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">
                    Acompanhamento de Vendas
                  </p>
                </div>

                {activeOrders.map((o) => {
                  const col = colFor(o.status);
                  const isPendingPayment = o.status === "aguardando_pagamento";

                  return (
                    <div
                      key={o.id}
                      className="bg-card rounded-xl border border-border shadow-sm flex flex-col active:scale-[0.98] transition-transform cursor-pointer hover:shadow-md"
                      onClick={() => setSelected(o)}
                    >
                      <div className="p-4 flex items-start justify-between">
                        <div className="min-w-0 pr-3 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                              {o.orderNumber}
                            </span>
                            {o.priority === "Urgente" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase">
                                Urgente
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-foreground leading-tight truncate mb-0.5">
                            {o.clientName}
                          </h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Package className="w-3 h-3 opacity-60" />
                            {o.items.length}{" "}
                            {o.items.length === 1 ? "item" : "itens"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-black text-[#1e4023]">
                            {fmt(o.total)}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-secondary/30 border-t border-border flex items-center justify-between rounded-b-xl">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${col?.bg} ${col?.color} ${col?.border}`}
                          >
                            {col?.label}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3 opacity-50" />
                            {timeAgo(o.updatedAt)}
                          </span>
                        </div>

                        {isPendingPayment && o.paymentUrl && (
                          <button
                            onClick={(e) =>
                              handleCopyLink(e, o.paymentUrl!, o.id)
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors border border-orange-200 shadow-sm"
                          >
                            {copiedId === o.id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                <span className="text-[10px] font-bold">
                                  Copiado
                                </span>
                              </>
                            ) : (
                              <>
                                <Wallet className="w-3.5 h-3.5" />{" "}
                                <span className="text-[10px] font-bold">
                                  Cobrar
                                </span>
                              </>
                            )}
                          </button>
                        )}

                        {o.status === "rota" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(o);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:brightness-95 transition-colors shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                            <span className="text-[10px] font-bold">
                              Entregar
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* HISTÓRICO DE ENTREGAS */}
            {doneOrders.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-2 px-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-bold text-foreground">
                    Histórico de Entregas
                  </p>
                </div>
                {doneOrders.slice(0, 20).map((o) => (
                  <div
                    key={o.id}
                    className="bg-card rounded-xl border border-border p-3.5 flex items-center justify-between active:bg-secondary transition-colors cursor-pointer hover:shadow-sm"
                    onClick={() => setSelected(o)}
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-foreground truncate">
                        {o.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 opacity-60" />{" "}
                        {o.deliveryAddress?.split("—")[0] ||
                          "Endereço registrado"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground">
                        {fmt(o.total)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {timeAgo(o.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-3 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
