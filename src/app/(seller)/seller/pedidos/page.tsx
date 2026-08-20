"use client";

import { VendorPedidos } from "@/components/seller/VendorPedidos";
import { useApp } from "@/contexts/AppContext";
import { sellers } from "@/data/sellers";

export default function SellerPedidosPage() {
  const { session, orders, advance, addNote } = useApp();
  const seller = session?.sellerId ? sellers.find(s => s.id === session.sellerId) : null;

  if (!seller) return null;

  return (
    <VendorPedidos
      seller={seller}
      orders={orders}
      onAdvance={advance}
      onAddNote={addNote}
    />
  );
}
