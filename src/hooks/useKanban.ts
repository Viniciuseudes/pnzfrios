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
        nfe_status, nfe_url, nfe_number,
        payment_url, payment_method, asaas_payment_id,
        clients ( name ),
        sellers ( name, avatar ),
        order_items ( product_id, qty, price, products(name) ),
        order_history ( status, changed_by, note, created_at )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedOrders: any[] = data.map((o: any) => ({
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
        // Dados da NFe
        nfeStatus: o.nfe_status,
        nfeUrl: o.nfe_url,
        nfeNumber: o.nfe_number,
        // Dados de Pagamento
        paymentUrl: o.payment_url,
        paymentMethod: o.payment_method,
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

  // LÓGICA DE AVANÇO BLINDADA COM TRY/CATCH
  async function advance(id: string, note: string, by = "Admin Central") {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;
      
      const next = nextStatus(order.status);
      if (!next) return;

      // 1. TENTA ATUALIZAR O PEDIDO PRIMEIRO
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', id);

      // Se o banco recusar, o código "grita" um erro e para por aqui
      if (updateError) throw updateError;

      // 2. SÓ INSERE NO HISTÓRICO SE O PEDIDO FOI ATUALIZADO COM SUCESSO
      const { error: historyError } = await supabase
        .from('order_history')
        .insert([{ order_id: id, status: next, changed_by: by, note }]);

      if (historyError) throw historyError;

      // 3. Atualiza a tela puxando do banco novamente
      fetchOrders();

    } catch (error: any) {
      console.error("Erro fatal ao avançar pedido:", error);
      // Aqui ele vai te mostrar a verdadeira razão do banco estar bloqueando
      alert(`Falha ao avançar: ${error.message || error.details || "Erro desconhecido"}`);
    }
  }

  // LÓGICA DE CANCELAMENTO COM DEVOLUÇÃO DE ESTOQUE
  async function cancel(id: string, note: string, by = "Admin Central") {
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
        .from('orders')
        .update({ status: 'cancelado', updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (updateError) throw updateError;

      await supabase
        .from('order_history')
        .insert([{ 
          order_id: id, 
          status: 'cancelado', 
          changed_by: by, 
          note: note ? `Cancelado: ${note} (Estoque restaurado)` : "Pedido cancelado e estoque restaurado." 
        }]);

      fetchOrders();
      
      // --- INÍCIO DO GATILHO DE AVISO DE CANCELAMENTO PARA O VENDEDOR ---
      try {
        const order = orders.find(o => o.id === id);
        if (order && order.sellerId) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
          await fetch(`${baseUrl}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: order.sellerId, // Dispara para o vendedor daquele pedido
              title: "Aviso de Cancelamento",
              body: `O pedido ${order.orderNumber} do cliente ${order.clientName} foi cancelado pela administracao.`,
              url: "/seller/dashboard" // Leva o vendedor para a lista de pedidos
            })
          });
        }
      } catch (pushErr) {
        console.error("Erro ao notificar cancelamento:", pushErr);
      }
      // --- FIM DO GATILHO ---
      
    } catch (error) {
      console.error("Erro ao cancelar e devolver estoque:", error);
      alert("Falha ao cancelar o pedido e restaurar o estoque.");
    }
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