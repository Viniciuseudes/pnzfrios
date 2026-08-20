"use client";

import { useRouter } from "next/navigation";
import { LoginScreen } from "@/components/layout/LoginScreen";
import { useApp } from "@/contexts/AppContext";

export default function LoginPage() {
  const { login } = useApp();
  const router = useRouter();

  return (
    <LoginScreen
      onLogin={(role, sellerId) => {
        login(role, sellerId);
        router.push(role === "gestor" ? "/admin/dashboard" : "/seller/home");
      }}
    />
  );
}
