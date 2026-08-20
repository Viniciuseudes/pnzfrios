"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import { fmt } from "@/utils/format";
import { colFor } from "@/utils/kanban";
import type { Client } from "@/types";

export function ClientViewModal({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      // Busca todo o histórico de pedidos deste cliente e os itens de cada pedido
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id, order_number, status, created_at, notes,
          order_items (qty, price, products(name)),
          sellers (name)
        `,
        )
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      if (data && !error) {
        const formatted = data.map((o: any) => ({
          ...o,
          total: o.order_items.reduce(
            (acc: number, i: any) => acc + i.qty * i.price,
            0,
          ),
        }));
        setOrders(formatted);
      }
      setLoading(false);
    }
    fetchHistory();
  }, [client.id]);

  // Cálculos de KPI (LTV - Lifetime Value)
  const validOrders = orders.filter((o) => o.status !== "cancelado");
  const totalSpent = validOrders.reduce((acc, o) => acc + o.total, 0);
  const ticketMedio =
    validOrders.length > 0 ? totalSpent / validOrders.length : 0;
  const lastOrderDate =
    validOrders.length > 0
      ? new Date(validOrders[0].created_at).toLocaleDateString("pt-BR")
      : "--";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Cliente */}
        <div className="bg-[#1e4023] p-6 text-white flex-shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-10 translate-x-10 blur-2xl" />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border border-white/30 backdrop-blur-md">
                {client.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold leading-tight">
                  {client.name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-white/80 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {client.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {client.phone}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    {client.doc}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-secondary/10">
          {/* Cartões de KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Faturamento Total",
                value: fmt(totalSpent),
                icon: DollarSign,
                color: "text-emerald-600",
                bg: "bg-emerald-100",
              },
              {
                label: "Pedidos Realizados",
                value: validOrders.length,
                icon: ShoppingCart,
                color: "text-blue-600",
                bg: "bg-blue-100",
              },
              {
                label: "Ticket Médio",
                value: fmt(ticketMedio),
                icon: TrendingUp,
                color: "text-amber-600",
                bg: "bg-amber-100",
              },
              {
                label: "Última Compra",
                value: lastOrderDate,
                icon: Calendar,
                color: "text-purple-600",
                bg: "bg-purple-100",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4"
              >
                <div
                  className={`w-10 h-10 rounded-full ${kpi.bg} ${kpi.color} flex items-center justify-center flex-shrink-0`}
                >
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="text-lg font-black text-foreground">
                    {kpi.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">
              Histórico de Pedidos
            </h3>
          </div>

          {/* Lista de Pedidos (Timeline) */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 bg-card border border-dashed border-border rounded-xl text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mx-auto opacity-20 mb-2" />
              <p className="text-sm">Este cliente ainda não possui pedidos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const col = colFor(order.status) || {
                  label: order.status,
                  bg: "bg-gray-100",
                  color: "text-gray-700",
                  border: "border-gray-200",
                };
                const isExpanded = expandedOrder === order.id;

                return (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all hover:border-primary/40"
                  >
                    {/* Linha Resumo Clicável */}
                    <div
                      className="p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() =>
                        setExpandedOrder(isExpanded ? null : order.id)
                      }
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 font-black text-xs text-muted-foreground">
                          {order.order_number}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {new Date(order.created_at).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vendedor: {order.sellers?.name || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 ml-auto">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${col.bg} ${col.color} ${col.border}`}
                        >
                          {col.label}
                        </span>
                        <span className="text-base font-black text-primary w-24 text-right">
                          {fmt(order.total)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Detalhamento dos Itens (Expandido) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border bg-secondary/10"
                        >
                          <div className="p-4 space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                              Itens Comprados
                            </p>
                            {order.order_items.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-sm bg-card p-2.5 rounded-lg border border-border/50"
                              >
                                <span className="font-medium text-foreground">
                                  {item.products?.name || "Produto Excluído"}
                                </span>
                                <div className="flex items-center gap-4">
                                  <span className="text-muted-foreground text-xs">
                                    {item.qty}x {fmt(item.price)}
                                  </span>
                                  <span className="font-bold text-foreground min-w-[80px] text-right">
                                    {fmt(item.qty * item.price)}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {order.notes && (
                              <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 italic">
                                <strong>Obs do Pedido:</strong> {order.notes}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
