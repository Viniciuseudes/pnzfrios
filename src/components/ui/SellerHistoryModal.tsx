"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, MapPin, TrendingUp, Package, Calendar } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { fmt } from "@/utils/format";
import type { Seller } from "@/types";

export function SellerHistoryModal({
  seller,
  onClose,
}: {
  seller: Seller;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHistorico, setTotalHistorico] = useState(0);

  useEffect(() => {
    async function fetchSellerHistory() {
      setLoading(true);

      // Busca todo o histórico de pedidos desse vendedor
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id, order_number, status, created_at, delivery_address,
          clients ( name ),
          order_items (qty, price)
        `,
        )
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        let total = 0;
        const formatted = data.map((o: any) => {
          const orderTotal = o.order_items.reduce(
            (acc: number, item: any) => acc + item.qty * item.price,
            0,
          );

          if (o.status !== "cancelado") {
            total += orderTotal;
          }

          return {
            id: o.id,
            orderNumber: o.order_number,
            status: o.status,
            clientName: o.clients?.name || "Desconhecido",
            date: new Date(o.created_at).toLocaleDateString("pt-BR"),
            address: o.delivery_address || "Não informado",
            total: orderTotal,
          };
        });

        setOrders(formatted);
        setTotalHistorico(total);
      }
      setLoading(false);
    }

    fetchSellerHistory();
  }, [seller.id]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/20">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Auditoria de Vendas: {seller.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Região Principal: {seller.region}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* ESTATÍSTICAS GERAIS */}
        <div className="grid grid-cols-2 gap-4 p-5 border-b border-border bg-card">
          <div className="p-4 rounded-xl border border-border bg-secondary/10 flex flex-col">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
              Total Histórico Faturado
            </span>
            <span className="text-2xl font-black text-[#1e4023]">
              {fmt(totalHistorico)}
            </span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-secondary/10 flex flex-col">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
              Total de Pedidos Realizados
            </span>
            <span className="text-2xl font-black text-foreground">
              {orders.length}
            </span>
          </div>
        </div>

        {/* LISTA DE PEDIDOS */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Relatório de Pedidos
          </h3>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto opacity-20 mb-2" />
              <p className="text-sm">Nenhuma venda registrada no histórico.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Pedido</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Localidade</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5" /> {o.date}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {o.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {o.clientName}
                      </td>
                      <td
                        className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[150px]"
                        title={o.address}
                      >
                        {o.address}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                            o.status === "entregue"
                              ? "bg-emerald-100 text-emerald-700"
                              : o.status === "cancelado"
                                ? "bg-red-100 text-red-700"
                                : o.status === "aguardando_pagamento"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {o.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground text-right">
                        {fmt(o.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
