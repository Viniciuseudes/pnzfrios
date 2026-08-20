"use client";
import { useState } from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Target,
  MapPin,
  Mail,
  KeyRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { supabase } from "@/utils/supabase";
import { masks } from "@/utils/validators";

type SellerFormData = {
  name: string;
  region: string;
  target: string;
  email: string;
  password: string;
};

export function SellerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SellerFormData>();

  const onSubmit = async (data: SellerFormData) => {
    setSubmitError("");
    try {
      const numericTarget = parseFloat(
        data.target.replace(/\./g, "").replace(",", "."),
      );
      const initials = data.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

      // 1. Cria o perfil do vendedor e retorna os dados inseridos
      const { data: sellerData, error: sellerError } = await supabase
        .from("sellers")
        .insert([
          {
            name: data.name,
            region: data.region,
            target: numericTarget,
            avatar: initials,
            achieved: 0,
            orders_count: 0,
          },
        ])
        .select()
        .single();

      if (sellerError) throw sellerError;

      // 2. Cria as credenciais de acesso vinculadas a esse vendedor
      const { error: accountError } = await supabase.from("accounts").insert([
        {
          email: data.email.toLowerCase(),
          password_hash: data.password, // Nota: Numa V2, migraremos isso para o Supabase Auth
          role: "vendedor",
          name: data.name,
          avatar: initials,
          seller_id: sellerData.id,
        },
      ]);

      if (accountError) throw accountError;

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      if (error.code === "23505") {
        setSubmitError("Este e-mail já está sendo usado por outro usuário.");
      } else {
        setSubmitError(
          "Erro ao salvar vendedor e credenciais. Verifique os dados.",
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div
        className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Novo Vendedor
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie o perfil e as credenciais de acesso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {submitError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {submitError}
            </div>
          )}

          <form
            id="seller-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Seção 1: Dados Profissionais */}
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 border-b border-border pb-2">
                Dados Operacionais
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Nome Completo *
                  </label>
                  <input
                    {...register("name", { required: "O nome é obrigatório" })}
                    placeholder="Ex: João da Silva"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 transition ${errors.name ? "border-red-500" : "border-border focus:ring-primary/30"}`}
                  />
                  {errors.name && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" /> Região
                    de Atuação *
                  </label>
                  <input
                    {...register("region", {
                      required: "A região é obrigatória",
                    })}
                    placeholder="Ex: Zona Sul"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 transition ${errors.region ? "border-red-500" : "border-border focus:ring-primary/30"}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3 text-amber-600" /> Meta Mensal
                    (R$) *
                  </label>
                  <input
                    {...register("target", {
                      required: "A meta é obrigatória",
                    })}
                    onChange={(e) => {
                      e.target.value = masks.currency(e.target.value);
                      register("target").onChange(e);
                    }}
                    placeholder="15.000,00"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 transition ${errors.target ? "border-red-500" : "border-border focus:ring-primary/30"}`}
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Credenciais de Acesso */}
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 border-b border-border pb-2">
                Acesso ao Sistema
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/30 p-4 rounded-xl border border-border">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-muted-foreground" /> E-mail de
                    Login *
                  </label>
                  <input
                    type="email"
                    {...register("email", {
                      required: "O e-mail é obrigatório",
                    })}
                    placeholder="vendedor@empresa.com.br"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-card text-sm text-foreground focus:outline-none focus:ring-2 transition ${errors.email ? "border-red-500" : "border-border focus:ring-primary/30"}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-muted-foreground" /> Senha
                    Inicial *
                  </label>
                  <input
                    type="text"
                    {...register("password", {
                      required: "A senha é obrigatória",
                      minLength: {
                        value: 6,
                        message: "Mínimo de 6 caracteres",
                      },
                    })}
                    placeholder="Defina uma senha"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-card text-sm text-foreground focus:outline-none focus:ring-2 transition ${errors.password ? "border-red-500" : "border-border focus:ring-primary/30"}`}
                  />
                  {errors.password && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/20 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="seller-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-[#163318] active:scale-95 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[160px]"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" /> Cadastrar Acesso
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
