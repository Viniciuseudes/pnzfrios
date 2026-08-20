"use client";
import { useState, useEffect } from "react";
import { X, Search, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { supabase } from "@/utils/supabase";
import { masks, validateCPFCNPJ } from "@/utils/validators";
import type { Client } from "@/types";

// 1. DICA DE SÊNIOR: Estendemos o tipo Client localmente para avisar ao
// TypeScript que essas colunas existem no banco de dados.
type ExtendedClient = Client & {
  email?: string;
  zip_code?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  state?: string;
};

type ClientFormData = {
  name: string;
  doc: string;
  phone: string;
  email: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export function ClientModal({
  clientToEdit,
  onClose,
  onSuccess,
}: {
  clientToEdit?: ExtendedClient | null; // 2. Usamos o tipo estendido aqui!
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    defaultValues: { state: "RN" },
  });

  // PREENCHE OS DADOS SE FOR UMA EDIÇÃO
  useEffect(() => {
    if (clientToEdit) {
      reset({
        name: clientToEdit.name || "",
        doc: clientToEdit.doc || "",
        phone: clientToEdit.phone || "",
        email: clientToEdit.email || "",
        zip_code: clientToEdit.zip_code || "",
        street: clientToEdit.street || "",
        number: clientToEdit.number || "",
        complement: clientToEdit.complement || "",
        neighborhood: clientToEdit.neighborhood || "",
        city: clientToEdit.city || "",
        state: clientToEdit.state || "",
      });
    }
  }, [clientToEdit, reset]);

  const handleCepLookup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const maskedCep = masks.cep(rawValue);
    setValue("zip_code", maskedCep);

    const cleanCep = maskedCep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setValue("street", data.logradouro);
          setValue("neighborhood", data.bairro);
          setValue("city", data.localidade);
          setValue("state", data.uf);
          document.getElementById("input-number")?.focus();
        }
      } catch (err) {
        console.error("Erro na busca de CEP", err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    setSubmitError("");
    try {
      const payload = {
        name: data.name,
        doc: data.doc,
        phone: data.phone,
        email: data.email,
        zip_code: data.zip_code,
        street: data.street,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        status: clientToEdit ? clientToEdit.status : "Ativo",
      };

      if (clientToEdit) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", clientToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert([payload]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.code === "23505") {
        setSubmitError("Este CPF/CNPJ já está cadastrado no sistema.");
      } else {
        setSubmitError("Erro ao salvar cliente. Tente novamente.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div
        className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/40 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {clientToEdit ? "Editar Cliente" : "Novo Cliente"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {clientToEdit
                ? "Atualize os dados do cliente"
                : "Cadastre os dados fiscais e de entrega"}
            </p>
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
            id="client-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-8"
          >
            {/* Seção 1: Identificação */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  Identificação
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-12">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Nome / Razão Social *
                  </label>
                  <input
                    {...register("name", { required: "Campo obrigatório" })}
                    placeholder="Ex: Terra Coletiva Agricola Ltda"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 transition ${errors.name ? "border-red-500 focus:ring-red-500/30" : "border-border focus:ring-primary/30 focus:border-primary"}`}
                  />
                  {errors.name && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    CPF / CNPJ *
                  </label>
                  <input
                    {...register("doc", {
                      required: "Documento é obrigatório",
                      validate: (val) =>
                        validateCPFCNPJ(val) || "CPF/CNPJ inválido",
                    })}
                    onChange={(e) => {
                      e.target.value = masks.doc(e.target.value);
                      register("doc").onChange(e);
                    }}
                    placeholder="00.000.000/0001-00"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 transition ${errors.doc ? "border-red-500 focus:ring-red-500/30" : "border-border focus:ring-primary/30 focus:border-primary"}`}
                  />
                  {errors.doc && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.doc.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    E-mail *
                  </label>
                  <input
                    {...register("email", {
                      required: "E-mail obrigatório",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "E-mail inválido",
                      },
                    })}
                    type="email"
                    placeholder="contato@empresa.com.br"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 transition ${errors.email ? "border-red-500 focus:ring-red-500/30" : "border-border focus:ring-primary/30 focus:border-primary"}`}
                  />
                  {errors.email && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Telefone (WhatsApp) *
                  </label>
                  <input
                    {...register("phone", {
                      required: "Telefone obrigatório",
                      minLength: { value: 14, message: "Telefone incompleto" },
                    })}
                    onChange={(e) => {
                      e.target.value = masks.phone(e.target.value);
                      register("phone").onChange(e);
                    }}
                    placeholder="(00) 00000-0000"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 transition ${errors.phone ? "border-red-500 focus:ring-red-500/30" : "border-border focus:ring-primary/30 focus:border-primary"}`}
                  />
                  {errors.phone && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 2: Endereço */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  Endereço de Faturamento / Entrega
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4 relative">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    CEP *
                  </label>
                  <div className="relative">
                    <input
                      {...register("zip_code", {
                        required: "CEP obrigatório",
                        minLength: 9,
                      })}
                      onChange={handleCepLookup}
                      placeholder="00000-000"
                      className={`w-full pl-3 pr-10 py-2.5 rounded-lg border bg-input-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 transition ${errors.zip_code ? "border-red-500 focus:ring-red-500/30" : "border-border focus:ring-primary/30 focus:border-primary"}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isSearchingCep ? (
                        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Logradouro (Rua, Av.) *
                  </label>
                  <input
                    {...register("street", { required: true })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Número *
                  </label>
                  <input
                    id="input-number"
                    {...register("number", { required: true })}
                    placeholder="123"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>

                <div className="sm:col-span-9">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Complemento
                  </label>
                  <input
                    {...register("complement")}
                    placeholder="Galpão, Sala, Lote..."
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Bairro *
                  </label>
                  <input
                    {...register("neighborhood", { required: true })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Cidade *
                  </label>
                  <input
                    {...register("city", { required: true })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    UF *
                  </label>
                  <input
                    {...register("state", { required: true, maxLength: 2 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/20 flex-shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="client-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-[#163318] active:scale-95 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[140px]"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />{" "}
                {clientToEdit ? "Salvar Alterações" : "Salvar Cliente"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
