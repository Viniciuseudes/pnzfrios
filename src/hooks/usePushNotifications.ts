"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";

export function usePushNotifications() {
  const { session } = useApp();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!session) return;
    
    // Verifica se o navegador tem suporte
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      console.log("✅ Navegador suporta Web Push.");
      checkAndRegister();
    } else {
      console.error("❌ Navegador NÃO suporta Web Push ou não está em HTTPS/localhost.");
    }
  }, [session]);

  async function checkAndRegister() {
    try {
      console.log("⏳ Registrando Service Worker...");
      const register = await navigator.serviceWorker.register('/sw.js');
      console.log("✅ Service Worker registrado com sucesso!", register);
      
      // Verifica qual a permissão atual
      if (Notification.permission === 'granted') {
        console.log("✅ Permissão já estava concedida. Inscrevendo aparelho...");
        await subscribeDevice(register);
      } else if (Notification.permission === 'default') {
        console.log("⏳ Pedindo permissão ao usuário...");
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log("✅ O usuário aceitou! Inscrevendo aparelho...");
          await subscribeDevice(register);
        } else {
          console.warn("⚠️ O usuário negou ou fechou a permissão.");
        }
      } else {
        console.error("❌ Permissão de notificação está BLOQUEADA no navegador.");
      }
    } catch (error) {
      console.error("❌ Erro fatal no motor de Push:", error);
    }
  }

  async function subscribeDevice(register: ServiceWorkerRegistration) {
    try {
      const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      const userId = session?.role === "gestor" ? "admin" : session?.sellerId;

      console.log("⏳ Enviando inscrição para o Banco de Dados (Supabase)...");
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription })
      });

      if (response.ok) {
        console.log("🚀 TUDO PRONTO! Aparelho inscrito e pronto para receber Push!");
        setIsSubscribed(true);
      } else {
        console.error("❌ Erro ao salvar no banco:", await response.text());
      }
    } catch (error) {
      console.error("❌ Erro ao gerar a Subscription (Chaves VAPID estão corretas?):", error);
    }
  }

  // Função para chamar num botão, caso precise
  const forceRequest = () => {
    checkAndRegister();
  };

  return { isSubscribed, forceRequest };
}

// Função utilitária obrigatória para o Web Push
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}