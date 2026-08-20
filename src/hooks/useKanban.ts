"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import type { KanbanOrder, OrderStatus } from "@/types";
import { nextStatus } from "@/utils/kanban";

export function useKanban() {
  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, client_id, seller_id, priority, status, created_at, updated_at, notes, delivery_address,
        clients ( name ),
        sellers ( name, avatar ),
        order_items ( product_id, qty, price, products(name) ),
        order_history ( status, changed_by, note, created_at )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedOrders: KanbanOrder[] = data.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        clientId: o.client_id,
        clientName: o.clients?.name || "Cliente Excluído",
        sellerId: o.seller_id,
        sellerName: o.sellers?.name || "Desconhecido",
        sellerAvatar: o.sellers?.avatar || "VD",
        items: o.order_items.map((i: any) => ({
          productId: i.product_id,
          name: i.products?.name || "Produto Excluído",
          qty: i.qty,
          price: i.price
        })),
        total: o.order_items.reduce((acc: number, item: any) => acc + (item.qty * item.price), 0),
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
          note: h.note || ""
        }))
      }));
      setOrders(formattedOrders);
    }
    setLoading(false);
  }

  async function advance(id: string, note: string, by = "Admin Central") {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const next = nextStatus(order.status);
    if (!next) return;
    await supabase.from('orders').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id);
    await supabase.from('order_history').insert([{ order_id: id, status: next, changed_by: by, note }]);
    fetchOrders();
  }

  async function cancel(id: string, note: string, by = "Admin Central") {
    await supabase.from('orders').update({ status: 'cancelado', updated_at: new Date().toISOString() }).eq('id', id);
    await supabase.from('order_history').insert([{ order_id: id, status: 'cancelado', changed_by: by, note }]);
    fetchOrders();
  }

  async function addNote(id: string, note: string, by = "Admin Central") {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    await supabase.from('order_history').insert([{ order_id: id, status: order.status, changed_by: by, note }]);
    await supabase.from('orders').update({ updated_at: new Date().toISOString() }).eq('id', id);
    fetchOrders();
  }

  const urgentActive = orders.filter(o => o.priority === "Urgente" && !["entregue", "cancelado"].includes(o.status)).length;

  return { orders, loading, urgentActive, advance, cancel, addNote };
}