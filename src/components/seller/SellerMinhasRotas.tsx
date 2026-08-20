"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Route, MapPin, Calendar, Timer, Zap, CheckCircle, ChevronDown, PhoneCall } from "lucide-react";
import { STATUS_COLORS } from "@/utils/kanban";
import type { Seller, SalesRoute, RouteStop } from "@/types";

export function SellerMinhasRotas({ seller, sellerRoutes, onUpdate }: {
  seller: Seller;
  sellerRoutes: SalesRoute[];
  onUpdate: (r: SalesRoute[]) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(sellerRoutes[0]?.id ?? null);

  function markStop(routeId: number, stopId: number, status: RouteStop["status"]) {
    onUpdate(sellerRoutes.map(r =>
      r.id !== routeId ? r : { ...r, stops: r.stops.map(s => s.id === stopId ? { ...s, status } : s) }
    ));
  }

  if (sellerRoutes.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <Route className="w-10 h-10 opacity-20" />
      <p className="text-sm">Nenhuma rota atribuída a você</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Minhas Rotas</h2>
        <p className="text-xs text-muted-foreground">{sellerRoutes.length} rota(s) atribuída(s) a você</p>
      </div>
      {sellerRoutes.map(r => {
        const visited = r.stops.filter(s => s.status === "Visitado").length;
        const pct = r.stops.length > 0 ? (visited / r.stops.length) * 100 : 0;
        const open = expanded === r.id;
        return (
          <div key={r.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className={`h-1 ${r.priority === "Urgente" ? "bg-red-500" : "bg-gradient-to-r from-[#1e4023] to-[#2d6a3a]"}`} />
            <button className="w-full p-4 text-left" onClick={() => setExpanded(open ? null : r.id)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-foreground">{r.name}</p>
                    {r.priority === "Urgente" && <Zap className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{r.startTime}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.stops.length} paradas</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[#1e4023] transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{visited}/{r.stops.length} visitados</p>
            </button>
            <AnimatePresence>
              {open && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-border">
                  {r.notes && (
                    <div className="px-4 py-3 bg-secondary/30">
                      <p className="text-xs text-muted-foreground italic">"{r.notes}"</p>
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    {r.stops.map((stop, i) => (
                      <div key={stop.id} className={`rounded-xl border p-3 transition-all ${stop.status === "Visitado" ? "bg-emerald-50 border-emerald-200" : stop.status === "Não visitado" ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${stop.status === "Visitado" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{stop.clientName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{stop.city}</p>
                            {stop.observation && <p className="text-xs text-muted-foreground/70 mt-1 italic">"{stop.observation}"</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <a href={`tel:${stop.phone}`} className="flex items-center gap-1 text-xs text-[#1e4023] font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                                <PhoneCall className="w-3 h-3" />{stop.phone}
                              </a>
                              {stop.status !== "Visitado" && (
                                <button onClick={() => markStop(r.id, stop.id, "Visitado")}
                                  className="flex items-center gap-1 text-xs text-white bg-emerald-500 px-2.5 py-1 rounded-lg hover:bg-emerald-600 transition-colors font-medium">
                                  <CheckCircle className="w-3 h-3" /> Marcar visitado
                                </button>
                              )}
                              {stop.status === "Visitado" && (
                                <button onClick={() => markStop(r.id, stop.id, "Pendente")}
                                  className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg hover:bg-secondary transition-colors">
                                  Desfazer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
