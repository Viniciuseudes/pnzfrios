"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  X,
  Trash2,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface DeleteConfirmModalProps {
  title: string;
  itemName: string;
  warningText?: string;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export function DeleteConfirmModal({
  title,
  itemName,
  warningText = "Esta ação é permanente e não poderá ser desfeita.",
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const { session } = useApp();
  const gestorName = session?.name || "Gestor";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Digite sua senha de gestor para confirmar.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await onConfirm(password);
      onClose();
    } catch (err: any) {
      setError(err.message || "Senha incorreta ou falha ao excluir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-red-500" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-red-50/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground">
                Confirmação de segurança obrigatória
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              Você está prestes a excluir{" "}
              <strong className="font-bold text-foreground">
                "{itemName}"
              </strong>
              . {warningText}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Senha de {gestorName} *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Digite sua senha para autorizar..."
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 active:scale-95 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" /> Confirmar Exclusão
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
