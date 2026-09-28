"use client";
import { useState } from "react";
import { motion } from "motion/react";
import {
  X,
  Zap,
  MapPin,
  User2,
  StickyNote,
  ChevronRight,
  FileText,
  CheckCircle,
  RefreshCw,
  Wallet,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { colFor, nextStatus } from "@/utils/kanban";
import { fmt } from "@/utils/format";
import { supabase } from "@/utils/supabase";
import type { KanbanOrder } from "@/types";

export function OrderDetailModal({
  order,
  onClose,
  onAdvance,
  onCancel,
  onAddNote,
  isAdmin,
}: {
  order: KanbanOrder & {
    nfeStatus?: string;
    nfeUrl?: string;
    nfeNumber?: string;
    paymentUrl?: string;
    paymentMethod?: string;
  };
  onClose: () => void;
  onAdvance: (id: string, note: string) => void;
  onCancel: (id: string, note: string) => void;
  onAddNote: (id: string, note: string) => void;
  isAdmin: boolean;
}) {
  const [note, setNote] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [isEmittingNfe, setIsEmittingNfe] = useState(false);
  const [isCheckingNfe, setIsCheckingNfe] = useState(false);
  const [localNfeStatus, setLocalNfeStatus] = useState(order.nfeStatus);
  const [localNfeUrl, setLocalNfeUrl] = useState(order.nfeUrl);

  const [isNcmModalOpen, setIsNcmModalOpen] = useState(false);
  const [itemsMissingNcm, setItemsMissingNcm] = useState<any[]>([]);
  const [ncmValues, setNcmValues] = useState<Record<string, string>>({});
  const [isSavingNcm, setIsSavingNcm] = useState(false);

  const col = colFor(order.status) || {
    bg: "bg-gray-50",
    color: "text-gray-700",
    border: "border-gray-200",
    dot: "bg-gray-500",
    label: "Desconhecido",
  };
  const next = nextStatus(order.status);
  const nextCol = next ? colFor(next) : null;

  const canAdvance = isAdmin ? !!next : order.status === "rota";
  const canCancel =
    isAdmin && order.status !== "entregue" && order.status !== "cancelado";

  async function handlePrepararEmissao() {
    if (
      !confirm(
        "Confirmar a emissão da Nota Fiscal Eletrônica para este pedido?",
      )
    )
      return;

    setIsEmittingNfe(true);
    try {
      const { data: orderDetails, error } = await supabase
        .from("order_items")
        .select(
          `
          id, 
          product_id, 
          products ( id, name, ncm )
        `,
        )
        .eq("order_id", order.id);

      if (error) throw error;

      const missing = (orderDetails || []).filter(
        (item: any) =>
          !item.products?.ncm ||
          item.products.ncm.replace(/\D/g, "").length < 8,
      );

      if (missing.length > 0) {
        setItemsMissingNcm(missing);
        setIsNcmModalOpen(true);
        setIsEmittingNfe(false);
        return;
      }

      await processNfeEmission();
    } catch (err: any) {
      console.error("Erro ao verificar itens do pedido:", err);
      alert("Erro ao validar os produtos. Verifique sua conexão.");
      setIsEmittingNfe(false);
    }
  }

  async function handleSaveNcmAndEmit() {
    const invalid = itemsMissingNcm.some(
      (item) => (ncmValues[item.product_id] || "").length !== 8,
    );
    if (invalid) {
      alert(
        "Por favor, preencha todos os campos de NCM com exatamente 8 dígitos.",
      );
      return;
    }

    setIsSavingNcm(true);
    try {
      for (const item of itemsMissingNcm) {
        await supabase
          .from("products")
          .update({ ncm: ncmValues[item.product_id] })
          .eq("id", item.product_id);
      }

      setIsNcmModalOpen(false);
      setIsEmittingNfe(true);

      await processNfeEmission();
    } catch (err) {
      console.error("Erro ao salvar NCMs:", err);
      alert("Falha ao salvar os dados fiscais. Tente novamente.");
    } finally {
      setIsSavingNcm(false);
    }
  }

  async function processNfeEmission() {
    try {
      const res = await fetch("/api/nfe/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.error || "Erro desconhecido ao emitir NF-e");

      const novoStatus = data.status === "EMITIDA" ? "EMITIDA" : "PROCESSANDO";
      const novaUrl = data.nfe_url || "";

      await supabase
        .from("orders")
        .update({
          nfe_status: novoStatus,
          nfe_url: novaUrl,
          nfe_number: data.nfe_number?.toString(),
        })
        .eq("id", order.id);

      setLocalNfeStatus(novoStatus);
      setLocalNfeUrl(novaUrl);
    } catch (err: any) {
      console.error("Erro NFe:", err);
      setLocalNfeStatus("ERRO");
      await supabase
        .from("orders")
        .update({ nfe_status: "ERRO" })
        .eq("id", order.id);
      alert(`Falha na emissão da NF-e: ${err.message}`);
    } finally {
      setIsEmittingNfe(false);
    }
  }

  async function handleCheckNfeStatus() {
    setIsCheckingNfe(true);
    try {
      const res = await fetch("/api/nfe/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao consultar status na SEFAZ.");
      }

      setLocalNfeStatus(data.status);
      if (data.url) setLocalNfeUrl(data.url);

      if (data.status === "EMITIDA") {
        alert("Nota Fiscal autorizada com sucesso!");
        window.location.reload();
      } else if (data.status === "ERRO") {
        alert(
          "A SEFAZ rejeitou a nota. Verifique o painel do ERP para corrigir.",
        );
      } else {
        alert("A nota ainda está em processamento na SEFAZ.");
      }
    } catch (err: any) {
      console.error("Erro detalhado na consulta:", err);
      alert(`Falha ao consultar SEFAZ: ${err.message}`);
    } finally {
      setIsCheckingNfe(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {isNcmModalOpen && (
          <div className="absolute inset-0 z-[60] bg-card flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-yellow-50/50">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Dados Fiscais Pendentes</h3>
              </div>
              <button
                onClick={() => setIsNcmModalOpen(false)}
                className="p-1 hover:bg-yellow-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-yellow-800" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <p className="text-xs text-muted-foreground mb-4">
                Para emitir a nota fiscal, a SEFAZ exige a classificação NCM dos
                produtos. Preencha os códigos de 8 dígitos abaixo (eles serão
                salvos para as próximas vendas):
              </p>

              <div className="space-y-4">
                {itemsMissingNcm.map((item) => (
                  <div
                    key={item.id}
                    className="bg-secondary/20 p-3 rounded-lg border border-border"
                  >
                    <label className="text-sm font-semibold text-foreground">
                      {item.products.name}
                    </label>
                    <input
                      type="text"
                      value={ncmValues[item.product_id] || ""}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 8);
                        setNcmValues({ ...ncmValues, [item.product_id]: val });
                      }}
                      placeholder="Ex: 02071100"
                      className="mt-2 w-full px-3 py-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      maxLength={8}
                    />
                    {(ncmValues[item.product_id] || "").length > 0 &&
                      (ncmValues[item.product_id] || "").length < 8 && (
                        <span className="text-[10px] text-red-500 mt-1 block">
                          Faltam {8 - (ncmValues[item.product_id] || "").length}{" "}
                          dígitos
                        </span>
                      )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-2 bg-secondary/10">
              <button
                onClick={() => setIsNcmModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNcmAndEmit}
                disabled={isSavingNcm}
                className="flex-1 flex items-center justify-center bg-primary text-primary-foreground font-bold text-xs rounded-xl py-2 hover:bg-[#163318] transition-colors disabled:opacity-50"
              >
                {isSavingNcm
                  ? "Salvando e Emitindo..."
                  : "Salvar e Emitir NF-e"}
              </button>
            </div>
          </div>
        )}

        <div className={`h-1.5 w-full ${col.dot}`} />
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-black text-foreground">
                {order.orderNumber}
              </span>
              {order.priority === "Urgente" && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                  <Zap className="w-2.5 h-2.5" />
                  URGENTE
                </span>
              )}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${col.bg} ${col.color} ${col.border}`}
              >
                {col.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {order.clientName}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1">
                <User2 className="w-3 h-3" />
                {order.sellerName}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {order.deliveryAddress?.split(" ")[1]?.trim() || "Sem endereço"}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isAdmin && order.status !== "cancelado" && (
            <div className="px-5 py-4 border-b border-border bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Nota Fiscal
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {localNfeStatus === "EMITIDA"
                        ? "Documento autorizado"
                        : localNfeStatus === "PROCESSANDO"
                          ? "Aguardando SEFAZ"
                          : "Emissão via Base ERP"}
                    </p>
                  </div>
                </div>

                {localNfeStatus === "EMITIDA" ? (
                  <a
                    href={localNfeUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> PDF Gerado
                  </a>
                ) : localNfeStatus === "PROCESSANDO" ? (
                  <button
                    onClick={handleCheckNfeStatus}
                    disabled={isCheckingNfe}
                    className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {isCheckingNfe ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {isCheckingNfe ? "Consultando..." : "Consultar SEFAZ"}
                  </button>
                ) : (
                  <button
                    onClick={handlePrepararEmissao}
                    disabled={isEmittingNfe}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isEmittingNfe ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Emitir NF-e"
                    )}
                  </button>
                )}
              </div>
              {localNfeStatus === "ERRO" && (
                <p className="text-[10px] text-red-500 mt-2 font-medium">
                  ⚠️ Houve uma falha na última tentativa de emissão. A SEFAZ
                  pode ter rejeitado.
                </p>
              )}
            </div>
          )}

          {isAdmin && order.status === "aguardando_pagamento" && (
            <div className="px-5 py-4 border-b border-border bg-orange-50/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-800">
                      Pagamento Pendente
                    </p>
                    <p className="text-[10px] text-orange-600/80">
                      Link via Asaas ({order.paymentMethod || "PIX/Boleto"})
                    </p>
                  </div>
                </div>

                {order.paymentUrl ? (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(order.paymentUrl || "");
                      alert(
                        "Link de pagamento copiado! Cole no WhatsApp do cliente.",
                      );
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 active:scale-95 transition-all shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar Link (2ª Via)
                  </button>
                ) : (
                  <span className="text-[10px] text-orange-600 italic">
                    Link não disponível no banco
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Itens do Pedido
            </p>
            <div className="space-y-1.5">
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground">{item.name}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="font-mono text-xs">
                      {item.qty}x {fmt(item.price)}
                    </span>
                    <span className="font-semibold text-foreground">
                      {fmt(item.qty * item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-border">
              <span className="text-sm font-semibold text-foreground">
                Total do Pedido
              </span>
              <span className="text-lg font-black text-[#1e4023]">
                {fmt(order.total)}
              </span>
            </div>
          </div>

          {(order.deliveryAddress || order.notes) && (
            <div className="px-5 py-3 border-b border-border space-y-2">
              {order.deliveryAddress && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#1e4023]" />
                  {order.deliveryAddress}
                </p>
              )}
              {order.notes && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5 italic">
                  <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />"
                  {order.notes}"
                </p>
              )}
            </div>
          )}

          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Histórico do Ciclo
            </p>
            <div className="relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {order.history.map((h, i) => {
                  const hCol = colFor(h.status) || {
                    bg: "bg-gray-50",
                    color: "text-gray-700",
                    border: "border-gray-200",
                    dot: "bg-gray-500",
                    label: h.status,
                  };
                  return (
                    <div key={i} className="flex gap-3 items-start">
                      <div
                        className={`w-6 h-6 rounded-full ${hCol.dot} flex items-center justify-center flex-shrink-0 z-10 ring-2 ring-card`}
                      >
                        <span className="w-2 h-2 rounded-full bg-white" />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${hCol.bg} ${hCol.color} ${hCol.border}`}
                          >
                            {hCol.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {h.by}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50 ml-auto">
                            {h.time.split("T")[1]?.substring(0, 5) || ""}
                          </span>
                        </div>
                        {h.note && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">
                            "{h.note}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Adicionar observação
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Confirmado por telefone, entregue no depósito..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-border bg-secondary/20">
          {canAdvance && nextCol && !confirmCancel && (
            <button
              onClick={() => {
                onAdvance(order.id, note);
                onClose();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold ${nextCol.bg} ${nextCol.color} border ${nextCol.border} hover:brightness-95 transition-all`}
            >
              <ChevronRight className="w-4 h-4" />
              {isAdmin ? `Mover para: ${nextCol.label}` : "Confirmar Entrega"}
            </button>
          )}
          {canCancel && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              Cancelar
            </button>
          )}
          {confirmCancel && (
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium flex-1">
                Confirmar cancelamento?
              </span>
              <button
                onClick={() => {
                  onCancel(order.id, note);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-secondary transition-colors"
              >
                Não
              </button>
            </div>
          )}
          {!canAdvance && !canCancel && (
            <div className="flex-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {order.status === "entregue"
                  ? "Ciclo finalizado com sucesso"
                  : "Pedido encerrado"}
              </span>
              {note && (
                <button
                  onClick={() => {
                    onAddNote(order.id, note);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-[#163318] transition-colors"
                >
                  Salvar nota
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
