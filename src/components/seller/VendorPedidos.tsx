"use client";
import { useState, useEffect } from "react";
import {
  Clock,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Package,
  MapPin,
} from "lucide-react";
import { colFor, nextStatus, timeAgo } from "@/utils/kanban";
import { fmt } from "@/utils/format";
import type { KanbanOrder, OrderStatus } from "@/types";
import { OrderDetailModal } from "@/components/ui/OrderDetailModal";
import { supabase } from "@/utils/supabase";
import { useApp } from "@/contexts/AppContext";

const STATUS_FLOW: OrderStatus[] = ["novo", "preparando", "rota", "entregue"];

export function VendorPedidos() {
  const { session } = useApp();
  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [sellerName, setSellerName] = useState("Vendedor");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KanbanOrder | null>(null);

  async function fetchOrders() {
    if (!session?.sellerId) return;

    const [{ data: sData }, { data: oData, error }] = await Promise.all([
      supabase
        .from("sellers")
        .select("name")
        .eq("id", session.sellerId)
        .single(),
      supabase
        .from("orders")
        .select(
          `
          id, order_number, status, priority, created_at, updated_at, notes, delivery_address,
          client_id, clients(name), sellers(name, avatar),
          order_items(product_id, qty, price, products(name)),
          order_history(status, changed_by, note, created_at)
        `,
        )
        .eq("seller_id", session.sellerId)
        .order("created_at", { ascending: false }),
    ]);

    if (sData) setSellerName(sData.name);

    if (oData && !error) {
      const formatted: KanbanOrder[] = oData.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        clientId: o.client_id,
        clientName: o.clients?.name || "Cliente Excluído",
        sellerId: session.sellerId!,
        sellerName: o.sellers?.name || "Desconhecido",
        sellerAvatar: o.sellers?.avatar || "VD",
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

  // ATUALIZAÇÃO EM TEMPO REAL VIA SUPABASE CHANNELS
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_history" },
        () => {
          fetchOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeOrders = orders.filter(
    (o) => o.status !== "entregue" && o.status !== "cancelado",
  );
  const doneOrders = orders.filter((o) => o.status === "entregue");
  const totalVolume = activeOrders.reduce((acc, o) => acc + o.total, 0);

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

      <div className="space-y-6 pb-4">
        {/* Header Premium */}
        <div className="bg-primary rounded-2xl p-5 text-primary-foreground shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          <p className="text-sm font-medium opacity-80 mb-1">
            Resumo de Vendas (Ativas)
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-4">
            {fmt(totalVolume)}
          </h2>
          <div className="flex gap-4">
            <div className="bg-black/20 px-3 py-2 rounded-xl flex-1 backdrop-blur-md border border-white/10">
              <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold mb-0.5">
                Em Andamento
              </p>
              <p className="text-lg font-bold">{activeOrders.length}</p>
            </div>
            <div className="bg-black/20 px-3 py-2 rounded-xl flex-1 backdrop-blur-md border border-white/10">
              <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold mb-0.5">
                Finalizados
              </p>
              <p className="text-lg font-bold">{doneOrders.length}</p>
            </div>
          </div>
        </div>

        {activeOrders.length === 0 && doneOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 bg-card border border-border rounded-2xl shadow-sm">
            <ClipboardList className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">Nenhum pedido registrado</p>
          </div>
        )}

        {/* Lista de Pedidos Ativos */}
        {activeOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-foreground">
                Acompanhamento em Tempo Real
              </p>
            </div>

            {activeOrders.map((o) => {
              const col = colFor(o.status);
              const progress =
                ((STATUS_FLOW.indexOf(o.status) + 1) / STATUS_FLOW.length) *
                100;

              return (
                <div
                  key={o.id}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
                  onClick={() => setSelected(o)}
                >
                  <div
                    className={`h-1.5 w-full ${o.priority === "Urgente" ? "bg-red-500" : col?.dot || "bg-primary"}`}
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-muted-foreground">
                            {o.orderNumber}
                          </span>
                          {o.priority === "Urgente" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase">
                              Urgente
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-foreground leading-tight truncate">
                          {o.clientName}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-primary">
                          {fmt(o.total)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {o.items.length} itens
                        </p>
                      </div>
                    </div>

                    <div className="bg-secondary/40 rounded-xl p-3 mb-3 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${col?.bg} ${col?.color} border ${col?.border}`}
                        >
                          {col?.label}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeAgo(o.updatedAt)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {o.status === "rota" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(o);
                        }}
                        className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm"
                      >
                        Confirmar Entrega
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lista Histórica */}
        {doneOrders.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 px-1">
              <Package className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">
                Histórico de Entregas
              </p>
            </div>
            {doneOrders.slice(0, 10).map((o) => (
              <div
                key={o.id}
                className="bg-card rounded-xl border border-border p-3 flex items-center justify-between active:bg-secondary transition-colors"
                onClick={() => setSelected(o)}
              >
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-bold text-foreground truncate">
                    {o.clientName}
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />{" "}
                    {o.deliveryAddress?.split("—")[0] || "Endereço registrado"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-foreground">
                    {fmt(o.total)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {timeAgo(o.updatedAt)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 ml-2" />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
