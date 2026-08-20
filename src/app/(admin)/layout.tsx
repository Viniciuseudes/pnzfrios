"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { useApp } from "@/contexts/AppContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role !== "gestor") {
      router.replace("/seller/home");
    }
  }, [session, router]);

  if (!session || session.role !== "gestor") return null;

  return <AdminShell>{children}</AdminShell>;
}
