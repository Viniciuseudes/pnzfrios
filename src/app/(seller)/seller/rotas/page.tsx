"use client";

import { useState } from "react";
import { SellerMinhasRotas } from "@/components/seller/SellerMinhasRotas";
import { initialRoutes } from "@/data/routes";
import { useApp } from "@/contexts/AppContext";
import { sellers } from "@/data/sellers";

export default function SellerRotasPage() {
  const { session } = useApp();
  const seller = session?.sellerId ? sellers.find(s => s.id === session.sellerId) : null;
  const [routes, setRoutes] = useState(initialRoutes);

  if (!seller) return null;

  const sellerRoutes = routes.filter(r => r.sellerId === seller.id);

  return (
    <SellerMinhasRotas
      seller={seller}
      sellerRoutes={sellerRoutes}
      onUpdate={updated => setRoutes(prev => prev.map(r => {
        const updatedRoute = updated.find(u => u.id === r.id);
        return updatedRoute ?? r;
      }))}
    />
  );
}
