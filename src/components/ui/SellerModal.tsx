"use client";

import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Target,
  MapPin,
  Mail,
  KeyRound,
  Edit3,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { supabase } from "@/utils/supabase";
import { masks } from "@/utils/validators";
import type { Seller } from "@/types";

type SellerFormData = {
  name: string;
  region: string;
  target: string;
  email?: string;
  password?: string;
};

export function SellerModal({
  seller,
  onClose,
  onSuccess,
}: {
  seller?: Seller | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [submitError, setSubmitError] = useState("");
  const isEditing = !!seller;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SellerFormData>();

  useEffect(() => {
    if (seller) {
      setValue("name", seller.name);
      setValue("region", seller.region);
      setValue(
        "target",
        seller.target.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
    }
  }, [seller, setValue]);

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

      if (isEditing && seller) {
        const { error: updateError } = await supabase
          .from("sellers")
          .update({
            name: data.name,
            region: data.region,
            target: numericTarget,
            avatar: initials,
          })
          .eq("id", seller.id);

        if (updateError) throw updateError;
      } else {
        const response = await fetch("/api/vendedores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            region: data.region,
            target: numericTarget,
            avatar: initials,
            email: data.email?.toLowerCase(),
            password: data.password,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Erro ao cadastrar vendedor.");
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      setSubmitError(
        error.message || "Erro ao salvar os dados. Verifique as informações.",
      );
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
              {isEditing ? (
                <Edit3 className="w-5 h-5 text-primary" />
              ) : (
                <UserCheck className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isEditing ? "Editar Vendedor" : "Novo Vendedor"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Atualize as metas e dados operacionais"
                  : "Crie o perfil e as credenciais de acesso"}
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
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 transition ${
                      errors.name
                        ? "border-red-500"
                        : "border-border focus:ring-primary/30"
                    }`}
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
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 transition ${
                      errors.region
                        ? "border-red-500"
                        : "border-border focus:ring-primary/30"
                    }`}
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
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 transition ${
                      errors.target
                        ? "border-red-500"
                        : "border-border focus:ring-primary/30"
                    }`}
                  />
                </div>
              </div>
            </div>

            {!isEditing && (
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 border-b border-border pb-2">
                  Acesso ao Sistema
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/30 p-4 rounded-xl border border-border">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" /> E-mail
                      de Login *
                    </label>
                    <input
                      type="email"
                      {...register("email", {
                        required: "O e-mail é obrigatório",
                      })}
                      placeholder="vendedor@empresa.com.br"
                      className={`w-full px-3 py-2.5 rounded-lg border bg-card text-sm text-foreground focus:outline-none focus:ring-2 transition ${
                        errors.email
                          ? "border-red-500"
                          : "border-border focus:ring-primary/30"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-muted-foreground" />{" "}
                      Senha Inicial *
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
                      className={`w-full px-3 py-2.5 rounded-lg border bg-card text-sm text-foreground focus:outline-none focus:ring-2 transition ${
                        errors.password
                          ? "border-red-500"
                          : "border-border focus:ring-primary/30"
                      }`}
                    />
                    {errors.password && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
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
                <CheckCircle className="w-4 h-4 mr-2" />
                {isEditing ? "Salvar Alterações" : "Cadastrar Acesso"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
