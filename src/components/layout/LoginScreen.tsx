"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { supabase } from "@/utils/supabase";
import type { UserRole } from "@/types";

const logoImg = "/logo.svg";

export function LoginScreen({
  onLogin,
}: {
  onLogin: (role: UserRole, sellerId?: number) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreds, setShowCreds] = useState(false);

  const [demoAccounts, setDemoAccounts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase.from("accounts").select("*").limit(5);
      if (data) setDemoAccounts(data);
    }
    fetchAccounts();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const { data: acc, error: authError } = await supabase
        .from("accounts")
        .select("*")
        .eq("email", email.trim().toLowerCase())
        .eq("password_hash", password)
        .single();

      if (authError || !acc) {
        setError("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      setTimeout(() => {
        setLoading(false);
        // CORREÇÃO CRÍTICA: Força o texto para minúsculo para bater com a tipagem ("vendedor" ou "gestor")
        const safeRole = String(acc.role).toLowerCase() as UserRole;
        // Puxa o ID do vendedor cobrindo os padrões de nomenclatura do Supabase
        const safeSellerId = acc.seller_id || acc.sellerId || undefined;

        onLogin(safeRole, safeSellerId);
      }, 800);
    } catch (err) {
      console.error(err);
      setError("Erro ao conectar no servidor.");
      setLoading(false);
    }
  }

  function quickFill(acc: any) {
    setEmail(acc.email);
    setPassword(acc.password_hash);
    setShowCreds(false);
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #0e2410 0%, #1a3a1c 40%, #1e4d22 70%, #2a6030 100%)",
      }}
    >
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, #c8921c 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, #c8921c 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-5"
        style={{
          background: "radial-gradient(circle, #ffffff 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {[
        { top: "8%", left: "6%", size: 80, delay: 0, rotate: -20 },
        { top: "75%", left: "4%", size: 56, delay: 1.2, rotate: 30 },
        { top: "15%", right: "5%", size: 64, delay: 0.6, rotate: 15 },
        { top: "80%", right: "8%", size: 72, delay: 1.8, rotate: -35 },
      ].map((leaf, i) => (
        <motion.div
          key={i}
          className="absolute opacity-10 rounded-full border-2 border-[#c8921c]"
          style={{
            top: leaf.top,
            left: (leaf as any).left,
            right: (leaf as any).right,
            width: leaf.size,
            height: leaf.size,
            rotate: leaf.rotate,
          }}
          animate={{
            y: [0, -12, 0],
            rotate: [leaf.rotate, leaf.rotate + 8, leaf.rotate],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: leaf.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative mb-5"
          >
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-40"
              style={{
                background:
                  "radial-gradient(circle, #c8921c 0%, transparent 70%)",
                transform: "scale(1.4)",
              }}
            />
            <div
              className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-[#c8921c]/60 shadow-2xl"
              style={{
                boxShadow:
                  "0 0 40px rgba(200,146,28,0.35), 0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <ImageWithFallback
                src={logoImg}
                alt="PNZ Frios"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-center"
          >
            <p className="text-white/50 text-xs tracking-[0.25em] uppercase font-medium">
              Sistema de Gestão
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="rounded-2xl p-7 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <h2 className="text-white text-lg font-semibold mb-1">
            Bem-vindo de volta
          </h2>
          <p className="text-white/40 text-xs mb-6">
            Acesse sua conta para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#c8921c]/60 transition"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#c8921c]/60 transition"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs text-center bg-red-400/10 rounded-lg py-2 px-3"
              >
                {error}
              </motion.p>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  className="w-4 h-4 rounded border border-white/20 flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div className="w-2 h-2 rounded-sm bg-[#c8921c]" />
                </div>
                <span className="text-xs text-white/40">Lembrar-me</span>
              </label>
              <button
                type="button"
                className="text-xs text-[#c8921c]/80 hover:text-[#c8921c] transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 rounded-xl font-semibold text-sm overflow-hidden transition-all active:scale-[0.98] mt-2"
              style={{
                background: loading
                  ? "rgba(200,146,28,0.6)"
                  : "linear-gradient(135deg, #c8921c 0%, #e0a820 100%)",
                color: "#fff",
                boxShadow: loading ? "none" : "0 4px 20px rgba(200,146,28,0.4)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  Entrando...
                </span>
              ) : (
                "Entrar no Sistema"
              )}
            </button>
          </form>
        </motion.div>

        {demoAccounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4"
          >
            <button
              onClick={() => setShowCreds((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors py-1"
            >
              <KeyRound className="w-3 h-3" />
              {showCreds ? "Ocultar" : "Ver"} contas cadastradas
            </button>
            <AnimatePresence>
              {showCreds && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3 rounded-xl"
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="p-3 space-y-1">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-semibold">
                      Clique para preencher (Modo Dev)
                    </p>
                    {demoAccounts.map((acc) => (
                      <button
                        key={acc.email}
                        onClick={() => quickFill(acc)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${acc.role.toLowerCase() === "gestor" ? "bg-[#c8921c]" : "bg-[#1e4023]"}`}
                          >
                            {acc.avatar}
                          </span>
                          <div>
                            <p className="text-xs text-white/80 font-medium leading-none">
                              {acc.name}
                            </p>
                            <p className="text-[10px] text-white/30 mt-0.5">
                              {acc.email}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${acc.role.toLowerCase() === "gestor" ? "bg-[#c8921c]/20 text-[#c8921c]" : "bg-emerald-900/40 text-emerald-400"}`}
                        >
                          {acc.role.toLowerCase() === "gestor"
                            ? "Gestor"
                            : "Vendedor"}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
