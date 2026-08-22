"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { LoginScreen } from "@/components/layout/LoginScreen";

export default function LoginPage() {
  const { session, login } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      // O .trim() limpa qualquer espaço vazio que tenha vindo do banco de dados
      const role = String(session.role).trim().toLowerCase();

      if (role === "gestor") {
        router.replace("/admin/dashboard");
      } else if (role === "vendedor") {
        router.replace("/seller/dashboard");
      }
    }
  }, [session, router]);

  return <LoginScreen onLogin={login} />;
}
