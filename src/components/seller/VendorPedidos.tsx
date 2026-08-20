"use client";
import { useState, useEffect } from "react";
import { CheckCircle, Clock, ChevronRight, ClipboardList } from "lucide-react";
import { colFor, nextStatus, timeAgo } from "@/utils/kanban";
import { fmt } from "@/utils/format";
import type { KanbanOrder, OrderStatus } from "@/types";
import { OrderDetailModal } from "@/components/ui/OrderDetailModal";
import { supabase } from "@/utils/supabase";
import { useApp } from "@/contexts/AppContext";

// Constante tipada corretamente como um array de OrderStatus NOVO
const STATUS_FLOW: OrderStatus[] = ["novo", "preparando", "rota", "entregue"];

export function VendorPedidos() {
  const { session } = useApp();
  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [sellerName, setSellerName] = useState("Vendedor");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KanbanOrder | null>(null);

  async function fetchOrders() {
    if (!session?.sellerId) return;
    setLoading(true);

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
        client_id, clients(name),
        sellers(name, avatar),
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
        status: o.status as OrderStatus, // Garantindo o cast para OrderStatus
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
  }, [session]);

  // Função para avançar o status (Ex: De "Em Rota" para "Entregue")
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

    fetchOrders(); // Recarrega para atualizar a tela
  }

  // Função para adicionar uma nota logística
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

    fetchOrders();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4023]"></div>
      </div>
    );
  }

  const activeOrders = orders.filter(
    (o) => o.status !== "entregue" && o.status !== "cancelado",
  );
  const doneOrders = orders.filter((o) => o.status === "entregue");
  const cancelledOrders = orders.filter((o) => o.status === "cancelado");

  return (
    <>
      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onAdvance={handleAdvance}
          onCancel={() => {}} // Vendedor geralmente não cancela pedido direto no app, só via base
          onAddNote={handleAddNote}
          isAdmin={false}
        />
      )}
      <div className="space-y-5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Meus Pedidos</h2>
          <p className="text-xs text-muted-foreground">
            {orders.length} pedido(s) • {activeOrders.length} ativo(s)
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {[
            {
              label: "Em Andamento",
              count: activeOrders.length,
              color: "bg-[#1e4023] text-white",
            },
            {
              label: "Entregues",
              count: doneOrders.length,
              color: "bg-emerald-100 text-emerald-700",
            },
            {
              label: "Cancelados",
              count: cancelledOrders.length,
              color: "bg-red-50 text-red-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${s.color}`}
            >
              <span>{s.count}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2 bg-card border border-border rounded-2xl">
            <ClipboardList className="w-9 h-9 opacity-20" />
            <p className="text-sm">Nenhum pedido registrado ainda</p>
          </div>
        )}

        {activeOrders.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Em Andamento
            </p>
            {activeOrders.map((o) => {
              const col = colFor(o.status);
              const progress =
                ((STATUS_FLOW.indexOf(o.status) + 1) / STATUS_FLOW.length) *
                100;
              return (
                <div
                  key={o.id}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden cursor-pointer"
                  onClick={() => setSelected(o)}
                >
                  <div
                    className={`h-1 ${o.priority === "Urgente" ? "bg-red-500" : col?.dot || "bg-gray-500"}`}
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-muted-foreground">
                            {o.orderNumber}
                          </span>
                          {o.priority === "Urgente" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                              URGENTE
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-foreground mt-0.5">
                          {o.clientName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.items.length} itens • {fmt(o.total)}
                        </p>
                      </div>
                      {col && (
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-xl border flex-shrink-0 ${col.bg} ${col.color} ${col.border}`}
                        >
                          {col.label}
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1e4023] transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        {STATUS_FLOW.map((s, i) => {
                          const sCurrent = STATUS_FLOW.indexOf(o.status);
                          const sCol = colFor(s);
                          return (
                            <div
                              key={s}
                              className={`text-[8px] text-center flex-1 font-semibold ${i <= sCurrent ? sCol?.color : "text-muted-foreground/30"}`}
                            >
                              {sCol?.label.split(" ")[0]}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(o.updatedAt)}
                      </p>
                      <div className="flex items-center gap-2">
                        {o.status === "rota" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(o);
                            }}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" /> Confirmar
                            Entrega
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(o);
                          }}
                          className="text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-xl hover:bg-secondary transition-colors"
                        >
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {doneOrders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide mt-4">
              Entregues
            </p>
            {doneOrders.slice(0, 10).map((o) => (
              <div
                key={o.id}
                className="bg-card rounded-2xl border border-emerald-100 p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-50/30 transition-colors"
                onClick={() => setSelected(o)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-foreground">
                      {o.orderNumber} • {o.clientName}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 pl-5">
                    {fmt(o.total)} • {timeAgo(o.updatedAt)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
