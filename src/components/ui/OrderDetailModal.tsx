"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { X, Zap, MapPin, User2, StickyNote, ChevronRight } from "lucide-react";
import { colFor, nextStatus } from "@/utils/kanban";
import { fmt } from "@/utils/format";
import type { KanbanOrder } from "@/types";

export function OrderDetailModal({
  order, onClose, onAdvance, onCancel, onAddNote, isAdmin,
}: {
  order: KanbanOrder; onClose: () => void;
  onAdvance: (id: string, note: string) => void;
  onCancel: (id: string, note: string) => void;
  onAddNote: (id: string, note: string) => void;
  isAdmin: boolean;
}) {
  const [note, setNote] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const col = colFor(order.status);
  const next = nextStatus(order.status);
  const nextCol = next ? colFor(next) : null;
  const canAdvance = isAdmin ? !!next : order.status === "em_rota";
  const canCancel = isAdmin && order.status !== "entregue" && order.status !== "cancelado";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className={`h-1.5 w-full ${col.dot}`} />
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-black text-foreground">{order.orderNumber}</span>
              {order.priority === "Urgente" && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                  <Zap className="w-2.5 h-2.5" />URGENTE
                </span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${col.bg} ${col.color} ${col.border}`}>{col.label}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{order.clientName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1"><User2 className="w-3 h-3" />{order.sellerName}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{order.deliveryAddress.split("—")[1]?.trim()}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Itens do Pedido</p>
            <div className="space-y-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{item.name}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="font-mono text-xs">{item.qty}× {fmt(item.price)}</span>
                    <span className="font-semibold text-foreground">{fmt(item.qty * item.price)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-border">
              <span className="text-sm font-semibold text-foreground">Total do Pedido</span>
              <span className="text-lg font-black text-[#1e4023]">{fmt(order.total)}</span>
            </div>
          </div>

          {(order.deliveryAddress || order.notes) && (
            <div className="px-5 py-3 border-b border-border space-y-2">
              {order.deliveryAddress && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#1e4023]" />{order.deliveryAddress}
                </p>
              )}
              {order.notes && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5 italic">
                  <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />"{order.notes}"
                </p>
              )}
            </div>
          )}

          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Histórico do Ciclo</p>
            <div className="relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {order.history.map((h, i) => {
                  const hCol = colFor(h.status);
                  return (
                    <div key={i} className="flex gap-3 items-start">
                      <div className={`w-6 h-6 rounded-full ${hCol.dot} flex items-center justify-center flex-shrink-0 z-10 ring-2 ring-card`}>
                        <span className="w-2 h-2 rounded-full bg-white" />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${hCol.bg} ${hCol.color} ${hCol.border}`}>{hCol.label}</span>
                          <span className="text-[10px] text-muted-foreground">{h.by}</span>
                          <span className="text-[10px] text-muted-foreground/50 ml-auto">{h.time.split(" ")[1]} · {new Date(h.time).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                        </div>
                        {h.note && <p className="text-xs text-muted-foreground mt-0.5 italic">"{h.note}"</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <label className="block text-xs font-medium text-foreground mb-1.5">Adicionar observação</label>
            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Ex: Confirmado por telefone, entregue no depósito..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-border bg-secondary/20">
          {canAdvance && nextCol && !confirmCancel && (
            <button onClick={() => { onAdvance(order.id, note); onClose(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold ${nextCol.bg} ${nextCol.color} border ${nextCol.border} hover:brightness-95 transition-all`}>
              <ChevronRight className="w-4 h-4" />
              {isAdmin ? `Mover para: ${nextCol.label}` : "Confirmar Entrega"}
            </button>
          )}
          {canCancel && !confirmCancel && (
            <button onClick={() => setConfirmCancel(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
              Cancelar
            </button>
          )}
          {confirmCancel && (
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium flex-1">Confirmar cancelamento?</span>
              <button onClick={() => { onCancel(order.id, note); onClose(); }}
                className="px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors">Confirmar</button>
              <button onClick={() => setConfirmCancel(false)}
                className="px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-secondary transition-colors">Não</button>
            </div>
          )}
          {!canAdvance && !canCancel && (
            <div className="flex-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{order.status === "entregue" ? "✅ Ciclo finalizado com sucesso" : "Pedido encerrado"}</span>
              {note && (
                <button onClick={() => { onAddNote(order.id, note); onClose(); }}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-[#163318] transition-colors">
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
