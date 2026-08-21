"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Layers,
  Wallet,
  Zap,
  Circle,
  ChevronRight,
  Eye,
  Clock,
  MapPin,
  X,
} from "lucide-react";
// CORREÇÃO: KANBAN_COLS agora vem do utilitário oficial unificado
import { KANBAN_COLS, colFor, nextStatus, timeAgo } from "@/utils/kanban";
import { fmt } from "@/utils/format";
import type { KanbanOrder } from "@/types";
import { OrderDetailModal } from "@/components/ui/OrderDetailModal";

function KanbanCard({
  order,
  onClick,
  onQuickAdvance,
  isAdmin,
}: {
  order: KanbanOrder;
  onClick: () => void;
  onQuickAdvance: (id: string) => void;
  isAdmin: boolean;
}) {
  const col = colFor(order.status);
  const next = nextStatus(order.status);
  const nextCol = next ? colFor(next) : null;
  const age = (Date.now() - new Date(order.updatedAt).getTime()) / 36e5;
  const stuck =
    age > 8 && order.status !== "entregue" && order.status !== "cancelado";

  const sellerColors = [
    "bg-amber-600",
    "bg-[#1e4023]",
    "bg-[#2d6a3a]",
    "bg-[#c8921c]",
    "bg-blue-600",
  ];
  const colorIndex = order.sellerName
    ? order.sellerName.charCodeAt(0) % sellerColors.length
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-xl border shadow-sm cursor-pointer group transition-all hover:shadow-md hover:-translate-y-0.5 ${stuck ? "border-amber-300 ring-1 ring-amber-200" : "border-border"}`}
      onClick={onClick}
    >
      <div
        className={`h-1 rounded-t-xl ${order.priority === "Urgente" ? "bg-red-500" : col?.dot || "bg-gray-500"}`}
      />
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black text-muted-foreground">
              {order.orderNumber}
            </span>
            {order.priority === "Urgente" && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                <Zap className="w-2 h-2" />
                URGENTE
              </span>
            )}
            {stuck && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                <Eye className="w-2 h-2" />
                {Math.floor(age)}h parado
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
            {timeAgo(order.createdAt)}
          </span>
        </div>
        <p className="text-xs font-bold text-foreground leading-tight mb-1 line-clamp-1">
          {order.clientName}
        </p>
        <div className="flex items-center gap-1.5 mb-2.5">
          <div
            className={`w-4 h-4 rounded-full ${sellerColors[colorIndex]} flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0`}
          >
            {order.sellerAvatar ? order.sellerAvatar.substring(0, 2) : "VD"}
          </div>
          <span className="text-[10px] text-muted-foreground truncate">
            {order.sellerName ? order.sellerName.split(" ")[0] : "Desconhecido"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {order.items.length} {order.items.length === 1 ? "item" : "itens"}
          </span>
          <span className="text-xs font-black text-[#1e4023]">
            {fmt(order.total)}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1 truncate flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
          {order.deliveryAddress || "Endereço informado"}
        </p>
        {isAdmin && nextCol && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdvance(order.id);
            }}
            className={`mt-2.5 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all opacity-0 group-hover:opacity-100 ${nextCol.bg} ${nextCol.color} ${nextCol.border} hover:brightness-95`}
          >
            <ChevronRight className="w-3 h-3" /> {nextCol.label}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function CicloPedidos({
  orders,
  onAdvance,
  onCancel,
  onAddNote,
}: {
  orders: KanbanOrder[];
  onAdvance: (id: string, note: string, by?: string) => void;
  onCancel: (id: string, note: string, by?: string) => void;
  onAddNote: (id: string, note: string, by?: string) => void;
}) {
  const [selected, setSelected] = useState<KanbanOrder | null>(null);
  const [sellerFilter, setSellerFilter] = useState<number | "todos">("todos");
  const [priorityFilter, setPriorityFilter] = useState<"todas" | "Urgente">(
    "todas",
  );
  const [search, setSearch] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  const activeSellers = useMemo(() => {
    const uniqueIds = Array.from(new Set(orders.map((o) => o.sellerId)));
    return uniqueIds
      .map((id) => {
        const order = orders.find((o) => o.sellerId === id);
        return { id, name: order?.sellerName || "Desconhecido" };
      })
      .filter((s) => s.id !== undefined && s.id !== null);
  }, [orders]);

  const filtered = orders.filter((o) => {
    if (sellerFilter !== "todos" && o.sellerId !== sellerFilter) return false;
    if (priorityFilter === "Urgente" && o.priority !== "Urgente") return false;
    if (
      search &&
      !o.clientName?.toLowerCase().includes(search.toLowerCase()) &&
      !o.orderNumber?.includes(search)
    )
      return false;
    return true;
  });

  const activeCols = KANBAN_COLS.filter((c) => c.id !== "cancelado");

  const totalPipeline = orders
    .filter((o) => !["entregue", "cancelado"].includes(o.status))
    .reduce((a, o) => a + o.total, 0);

  const urgentCount = orders.filter(
    (o) =>
      o.priority === "Urgente" && !["entregue", "cancelado"].includes(o.status),
  ).length;

  const cancelledOrders = filtered.filter((o) => o.status === "cancelado");

  return (
    <>
      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onAdvance={(id, note) => onAdvance(id, note)}
          onCancel={(id, note) => onCancel(id, note)}
          onAddNote={(id, note) => onAddNote(id, note)}
          isAdmin={true}
        />
      )}
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#1e4023]" /> Ciclo de Pedidos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Do pedido ao cliente rastreamento em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 text-xs">
              <Wallet className="w-3.5 h-3.5 text-[#1e4023]" />
              <span className="text-muted-foreground">Pipeline ativo:</span>
              <span className="font-black text-[#1e4023]">
                {fmt(totalPipeline)}
              </span>
            </div>
            {urgentCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5 text-xs text-red-600 font-semibold">
                <Zap className="w-3 h-3" />
                {urgentCount} urgente(s)
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pedido ou cliente..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <select
            value={sellerFilter}
            onChange={(e) =>
              setSellerFilter(
                e.target.value === "todos" ? "todos" : Number(e.target.value),
              )
            }
            className="px-3 py-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition appearance-none"
          >
            <option value="todos">Todos vendedores</option>
            {activeSellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.split(" ")[0]}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              setPriorityFilter((p) => (p === "todas" ? "Urgente" : "todas"))
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${priorityFilter === "Urgente" ? "bg-red-50 border-red-300 text-red-600" : "bg-card border-border text-muted-foreground hover:bg-secondary"}`}
          >
            <Zap className="w-3 h-3" />{" "}
            {priorityFilter === "Urgente"
              ? "Somente urgentes"
              : "Filtrar urgentes"}
          </button>
          <button
            onClick={() => setShowCancelled((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${showCancelled ? "bg-red-50 border-red-300 text-red-600" : "bg-card border-border text-muted-foreground hover:bg-secondary"}`}
          >
            <Eye className="w-3 h-3" /> Cancelados ({cancelledOrders.length})
          </button>
        </div>

        <div className="overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar">
          <div
            className="flex gap-3"
            style={{ minWidth: `${activeCols.length * 272}px` }}
          >
            {activeCols.map((col) => {
              const colOrders = filtered
                .filter((o) => o.status === col.id)
                .sort(
                  (a, b) =>
                    (a.priority === "Urgente" ? -1 : 1) -
                    (b.priority === "Urgente" ? -1 : 1),
                );

              const colTotal = colOrders.reduce((a, o) => a + o.total, 0);

              return (
                <div
                  key={col.id}
                  className="w-[264px] flex-shrink-0 flex flex-col"
                >
                  <div
                    className={`rounded-xl border ${col.border} ${col.bg} px-3 py-2.5 mb-2 flex items-center justify-between flex-shrink-0`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className={`text-xs font-bold ${col.color}`}>
                        {col.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${col.dot} text-white`}
                      >
                        {colOrders.length}
                      </span>
                      {colOrders.length > 0 && (
                        <span
                          className={`text-[9px] font-semibold ${col.color} opacity-70`}
                        >
                          {fmt(colTotal)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex-1 space-y-2 overflow-y-auto pr-0.5"
                    style={{ maxHeight: "calc(100vh - 320px)", minHeight: 80 }}
                  >
                    <AnimatePresence>
                      {colOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/30 gap-1 border-2 border-dashed border-border rounded-xl">
                          <Circle className="w-5 h-5" />
                          <span className="text-[10px]">Vazio</span>
                        </div>
                      ) : (
                        colOrders.map((order) => (
                          <KanbanCard
                            key={order.id}
                            order={order}
                            isAdmin={true}
                            onClick={() => setSelected(order)}
                            onQuickAdvance={(id) => onAdvance(id, "")}
                          />
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showCancelled && cancelledOrders.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Pedidos Cancelados (
              {cancelledOrders.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {cancelledOrders.map((o) => (
                <KanbanCard
                  key={o.id}
                  order={o}
                  isAdmin={true}
                  onClick={() => setSelected(o)}
                  onQuickAdvance={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
