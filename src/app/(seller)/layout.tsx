"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { SellerShell } from "@/components/seller/SellerShell";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useApp();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!session) {
      router.replace("/login");
      return;
    }

    const role = String(session.role).trim().toLowerCase();
    if (role !== "vendedor") {
      router.replace("/login");
    }
  }, [session, router]);

  // Tela de carregamento enquanto valida a sessão
  if (
    !isMounted ||
    !session ||
    String(session.role).trim().toLowerCase() !== "vendedor"
  ) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#1e4023]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return <SellerShell>{children}</SellerShell>;
}
