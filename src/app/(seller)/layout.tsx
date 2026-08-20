"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SellerShell } from "@/components/seller/SellerShell";
import { useApp } from "@/contexts/AppContext";
import { sellers } from "@/data/sellers";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useApp();
  const router = useRouter();
  const seller = session?.sellerId
    ? sellers.find((s) => s.id === session.sellerId)
    : null;

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role !== "vendedor" || !seller) {
      router.replace(
        session?.role === "gestor" ? "/admin/dashboard" : "/login",
      );
    }
  }, [session, seller, router]);

  if (!session || session.role !== "vendedor" || !seller) return null;

  return <SellerShell>{children}</SellerShell>;
}
