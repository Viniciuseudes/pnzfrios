"use client";
import { CicloPedidos } from "@/components/admin/CicloPedidos";
import { useKanban } from "@/hooks/useKanban"; // <-- Importando o Hook Correto!

export default function AdminCicloPage() {
  const { orders, loading, advance, cancel, addNote } = useKanban();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4023]"></div>
      </div>
    );
  }

  return (
    <CicloPedidos
      orders={orders}
      onAdvance={advance}
      onCancel={cancel}
      onAddNote={addNote}
    />
  );
}
