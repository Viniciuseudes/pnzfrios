"use client";

import { useState } from "react";
import { CheckCircle, Clock, ChevronRight, ClipboardList } from "lucide-react";
import { colFor, nextStatus, timeAgo } from "@/utils/kanban";
import { STATUS_FLOW } from "@/data/kanban";
import { fmt } from "@/utils/format";
import type { Seller, KanbanOrder } from "@/types";
import { OrderDetailModal } from "@/components/ui/OrderDetailModal";

export function VendorPedidos({ seller, orders, onAdvance, onAddNote }: {
  seller: Seller;
  orders: KanbanOrder[];
  onAdvance: (id: string, note: string, by: string) => void;
  onAddNote: (id: string, note: string, by: string) => void;
}) {
  const [selected, setSelected] = useState<KanbanOrder | null>(null);
  const myOrders = orders
    .filter(o => o.sellerId === seller.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activeOrders = myOrders.filter(o => o.status !== "entregue" && o.status !== "cancelado");
  const doneOrders = myOrders.filter(o => o.status === "entregue");
  const cancelledOrders = myOrders.filter(o => o.status === "cancelado");

  return (
    <>
      {selected && (
        <OrderDetailModal order={selected} onClose={() => setSelected(null)}
          onAdvance={(id, note) => onAdvance(id, note, seller.name)}
          onCancel={() => {}}
          onAddNote={(id, note) => onAddNote(id, note, seller.name)}
          isAdmin={false} />
      )}
      <div className="space-y-5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Meus Pedidos</h2>
          <p className="text-xs text-muted-foreground">{myOrders.length} pedido(s) · {activeOrders.length} ativo(s)</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { label: "Em Andamento", count: activeOrders.length, color: "bg-[#1e4023] text-white" },
            { label: "Entregues", count: doneOrders.length, color: "bg-emerald-100 text-emerald-700" },
            { label: "Cancelados", count: cancelledOrders.length, color: "bg-red-50 text-red-600" },
          ] as const).map(s => (
            <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${s.color}`}>
              <span>{s.count}</span><span>{s.label}</span>
            </div>
          ))}
        </div>

        {myOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <ClipboardList className="w-9 h-9 opacity-20" />
            <p className="text-sm">Nenhum pedido registrado ainda</p>
          </div>
        )}

        {activeOrders.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Em Andamento</p>
            {activeOrders.map(o => {
              const col = colFor(o.status);
              const progress = ((STATUS_FLOW.indexOf(o.status) + 1) / STATUS_FLOW.length) * 100;
              return (
                <div key={o.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden cursor-pointer" onClick={() => setSelected(o)}>
                  <div className={`h-1 ${o.priority === "Urgente" ? "bg-red-500" : col.dot}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-muted-foreground">{o.orderNumber}</span>
                          {o.priority === "Urgente" && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">URGENTE</span>}
                        </div>
                        <p className="text-sm font-bold text-foreground mt-0.5">{o.clientName}</p>
                        <p className="text-xs text-muted-foreground">{o.items.length} itens · {fmt(o.total)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-xl border flex-shrink-0 ${col.bg} ${col.color} ${col.border}`}>{col.label}</span>
                    </div>
                    <div className="mb-3">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[#1e4023] transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        {STATUS_FLOW.map((s, i) => {
                          const sCurrent = STATUS_FLOW.indexOf(o.status);
                          const sCol = colFor(s);
                          return (
                            <div key={s} className={`text-[8px] text-center flex-1 font-semibold ${i <= sCurrent ? sCol.color : "text-muted-foreground/30"}`}>
                              {sCol.label.split(" ")[0]}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(o.updatedAt)}</p>
                      <div className="flex items-center gap-2">
                        {o.status === "em_rota" && (
                          <button onClick={e => { e.stopPropagation(); setSelected(o); }}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                            <CheckCircle className="w-3 h-3" /> Confirmar Entrega
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); setSelected(o); }}
                          className="text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-xl hover:bg-secondary transition-colors">
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
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Entregues</p>
            {doneOrders.slice(0, 5).map(o => (
              <div key={o.id} className="bg-card rounded-2xl border border-emerald-100 p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-50/30 transition-colors"
                onClick={() => setSelected(o)}>
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-foreground">{o.orderNumber} · {o.clientName}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 pl-5">{fmt(o.total)} · {timeAgo(o.updatedAt)}</p>
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
