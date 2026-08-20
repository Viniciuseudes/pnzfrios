"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import type { KanbanOrder } from "@/types";
import { nextStatus } from "@/utils/kanban";

export function useKanban() {
  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch inicial dos pedidos com relacionamentos
  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        clients ( name ),
        sellers ( name, avatar ),
        order_items ( product_id, qty, price, products(name) ),
        order_history ( status, changed_by, note, created_at )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar pedidos:", error);
      return;
    }

    // Mapeamento do payload do banco para a sua interface existente (KanbanOrder)
    const formattedOrders: KanbanOrder[] = data.map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      clientId: o.client_id,
      clientName: o.clients?.name,
      sellerId: o.seller_id,
      sellerName: o.sellers?.name,
      sellerAvatar: o.sellers?.avatar,
      items: o.order_items.map((i: any) => ({
        productId: i.product_id,
        name: i.products?.name,
        qty: i.qty,
        price: i.price
      })),
      total: o.order_items.reduce((acc: number, item: any) => acc + (item.qty * item.price), 0),
      priority: o.priority,
      status: o.status,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      notes: o.notes,
      deliveryAddress: o.delivery_address,
      history: o.order_history.map((h: any) => ({
        status: h.status,
        time: h.created_at,
        by: h.changed_by,
        note: h.note
      }))
    }));

    setOrders(formattedOrders);
    setLoading(false);
  }

  // 2. Avançar Status do Pedido
  async function advance(id: string, note: string, by = "Admin Central") {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    const next = nextStatus(order.status);
    if (!next) return;

    // Atualiza tabela principal
    await supabase
      .from('orders')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', id);

    // Registra no histórico
    await supabase
      .from('order_history')
      .insert([{ order_id: id, status: next, changed_by: by, note }]);

    // Atualiza cache local
    fetchOrders(); 
  }

  // 3. Adicionar Nota / Cancelar
  async function cancel(id: string, note: string, by = "Admin Central") {
    await supabase.from('orders').update({ status: 'cancelado', updated_at: new Date().toISOString() }).eq('id', id);
    await supabase.from('order_history').insert([{ order_id: id, status: 'cancelado', changed_by: by, note }]);
    fetchOrders();
  }

  const urgentActive = orders.filter(
    o => o.priority === "Urgente" && !["entregue", "cancelado"].includes(o.status)
  ).length;

  return { orders, loading, urgentActive, advance, cancel };
}