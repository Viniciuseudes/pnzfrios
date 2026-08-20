import type { OrderStatus, SalesRoute } from "@/types";
import { KANBAN_COLS, STATUS_FLOW } from "@/data/kanban";

export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

export function colFor(s: OrderStatus) {
  return KANBAN_COLS.find(c => c.id === s)!;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 36e5);
  if (h < 1) return "< 1h";
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export const STATUS_COLORS: Record<SalesRoute["status"], string> = {
  Rascunho: "bg-gray-100 text-gray-600 border-gray-200",
  Ativa:    "bg-amber-50 text-amber-700 border-amber-200",
  Concluída: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const PRIORITY_COLORS: Record<SalesRoute["priority"], string> = {
  Normal:  "bg-secondary text-secondary-foreground",
  Urgente: "bg-red-50 text-red-600 border border-red-200",
};
