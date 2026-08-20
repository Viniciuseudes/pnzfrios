"use client";

import { SellerHome } from "@/components/seller/SellerHome";
import { useApp } from "@/contexts/AppContext";
import { sellers } from "@/data/sellers";

export default function SellerHomePage() {
  const { session, orders } = useApp();
  const seller = session?.sellerId ? sellers.find(s => s.id === session.sellerId) : null;

  if (!seller) return null;

  return <SellerHome seller={seller} orders={orders} />;
}
