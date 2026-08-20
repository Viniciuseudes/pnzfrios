"use client";

import { CicloPedidos } from "@/components/admin/CicloPedidos";
import { useApp } from "@/contexts/AppContext";

export default function AdminCicloPage() {
  const { orders, advance, cancel, addNote } = useApp();

  return (
    <CicloPedidos
      orders={orders}
      onAdvance={advance}
      onCancel={cancel}
      onAddNote={addNote}
    />
  );
}
