"use client";

import { SellerMinhaMeta } from "@/components/seller/SellerMinhaMeta";
import { useApp } from "@/contexts/AppContext";
import { sellers } from "@/data/sellers";

export default function SellerMetaPage() {
  const { session } = useApp();
  const seller = session?.sellerId ? sellers.find(s => s.id === session.sellerId) : null;

  if (!seller) return null;

  return <SellerMinhaMeta seller={seller} />;
}
