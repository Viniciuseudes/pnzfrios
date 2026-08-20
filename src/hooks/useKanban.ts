"use client";

import { useState } from "react";
import type { KanbanOrder } from "@/types";
import { nextStatus } from "@/utils/kanban";

export function useKanban(initial: KanbanOrder[]) {
  const [orders, setOrders] = useState<KanbanOrder[]>(initial);

  const now = () => new Date().toLocaleString("sv-SE").replace("T", " ");

  function advance(id: string, note: string, by = "Admin Central") {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const next = nextStatus(o.status);
      if (!next) return o;
      return {
        ...o, status: next, updatedAt: now(),
        history: [...o.history, { status: next, time: now(), by, note: note || undefined }],
      };
    }));
  }

  function addNote(id: string, note: string, by = "Admin Central") {
    if (!note.trim()) return;
    setOrders(prev => prev.map(o => o.id !== id ? o : {
      ...o, updatedAt: now(),
      history: [...o.history, { status: o.status, time: now(), by, note }],
    }));
  }

  function cancel(id: string, note: string, by = "Admin Central") {
    setOrders(prev => prev.map(o => o.id !== id ? o : {
      ...o, status: "cancelado", updatedAt: now(),
      history: [...o.history, { status: "cancelado", time: now(), by, note: note || undefined }],
    }));
  }

  const urgentActive = orders.filter(
    o => o.priority === "Urgente" && !["entregue", "cancelado"].includes(o.status)
  ).length;

  return { orders, urgentActive, advance, addNote, cancel };
}
