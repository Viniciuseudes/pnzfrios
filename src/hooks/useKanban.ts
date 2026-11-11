"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import type { KanbanOrder, OrderStatus } from "@/types";
import { nextStatus } from "@/utils/kanban";
import { useApp } from "@/contexts/AppContext";

export function useKanban() {
  const { session } = useApp();
  const currentActor = session?.name || "Gestor";

  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, order_number, client_id, seller_id, priority, status, created_at, updated_at, notes, delivery_address,
        nfe_status, nfe_url, nfe_number,
        payment_url, payment_method, asaas_payment_id,
        clients ( name ),
        sellers ( name, avatar ),
        order_items ( product_id, qty, price, products(name) ),
        order_history ( status, changed_by, note, created_at )
      `
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formattedOrders: any[] = data.map((o: any) => {
        // Ordena o histórico cronologicamente para identificar quem criou o pedido
        const sortedHistory = [...(o.order_history || [])].sort(
          (a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const creatorBy = sortedHistory[0]?.changed_by || "Gestão";
        const creatorInitials = creatorBy
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();

        const isDirectSale = !o.seller_id;

        return {
          id: o.id,
          orderNumber: o.order_number,
          clientId: o.client_id,
          clientName: o.clients?.name || "Cliente Excluído",
          sellerId: o.seller_id,
          sellerName: isDirectSale
            ? `${creatorBy} (Venda Direta)`
            : o.sellers?.name || "Desconhecido",
          sellerAvatar: isDirectSale
            ? creatorInitials || "GD"
            : o.sellers?.avatar || "VD",
          items: o.order_items.map((i: any) => ({
            productId: i.product_id,
            name: i.products?.name || "Produto Excluído",
            qty: i.qty,
            price: i.price,
          })),
          total: o.order_items.reduce(
            (acc: number, item: any) => acc + item.qty * item.price,
            0
          ),
          priority: o.priority,
          status: o.status as OrderStatus,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
          notes: o.notes || "",
          deliveryAddress: o.delivery_address || "",
          nfeStatus: o.nfe_status,
          nfeUrl: o.nfe_url,
          nfeNumber: o.nfe_number,
          paymentUrl: o.payment_url,
          paymentMethod: o.payment_method,
          history: sortedHistory.map((h: any) => ({
            status: h.status as OrderStatus,
            time: h.created_at,
            by: h.changed_by,
            note: h.note || "",
          })),
        };
      });
      setOrders(formattedOrders);
    }
    setLoading(false);
  }

  async function advance(id: string, note: string, by?: string) {
    const actor = by || currentActor;
    try {
      const order = orders.find((o) => o.id === id);
      if (!order) return;

      const next = nextStatus(order.status);
      if (!next) return;

      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from("order_history")
        .insert([{ order_id: id, status: next, changed_by: actor, note }]);

      if (historyError) throw historyError;

      fetchOrders();
    } catch (error: any) {
      console.error("Erro fatal ao avançar pedido:", error);
      alert(
        `Falha ao avançar: ${error.message || error.details || "Erro desconhecido"}`
      );
    }
  }

  async function cancel(id: string, note: string, by?: string) {
    const actor = by || currentActor;
    try {
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, qty")
        .eq("order_id", id);

      if (itemsError) throw itemsError;

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          const { data: product } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (product) {
            const novoEstoque = product.stock + item.qty;
            await supabase
              .from("products")
              .update({ stock: novoEstoque })
              .eq("id", item.product_id);
          }
        }
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) throw updateError;

      await supabase.from("order_history").insert([
        {
          order_id: id,
          status: "cancelado",
          changed_by: actor,
          note: note
            ? `Cancelado por ${actor}: ${note} (Estoque restaurado)`
            : `Pedido cancelado por ${actor} e estoque restaurado.`,
        },
      ]);

      fetchOrders();

      try {
        const order = orders.find((o) => o.id === id);
        if (order && order.sellerId) {
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL ||
            (process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : "http://localhost:3000");
          await fetch(`${baseUrl}/api/push/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetUserId: order.sellerId,
              title: "Aviso de Cancelamento",
              body: `O pedido ${order.orderNumber} do cliente ${order.clientName} foi cancelado por ${actor}.`,
              url: "/seller/dashboard",
            }),
          });
        }
      } catch (pushErr) {
        console.error("Erro ao notificar cancelamento:", pushErr);
      }
    } catch (error) {
      console.error("Erro ao cancelar e devolver estoque:", error);
      alert("Falha ao cancelar o pedido e restaurar o estoque.");
    }
  }

  async function addNote(id: string, note: string, by?: string) {
    const actor = by || currentActor;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    await supabase
      .from("order_history")
      .insert([{ order_id: id, status: order.status, changed_by: actor, note }]);
    await supabase
      .from("orders")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);
    fetchOrders();
  }

  const urgentActive = orders.filter(
    (o) =>
      o.priority === "Urgente" && !["entregue", "cancelado"].includes(o.status)
  ).length;

  return { orders, loading, urgentActive, advance, cancel, addNote };
}