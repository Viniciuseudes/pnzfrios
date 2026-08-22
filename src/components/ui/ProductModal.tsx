"use client";
import { useState, useRef, useEffect } from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  Package,
  ShieldCheck,
  ThermometerSnowflake,
  DollarSign,
  ImagePlus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { supabase } from "@/utils/supabase";
import type { Product } from "@/types";

type ProductFormData = {
  name: string;
  sku: string;
  category: string;
  storage_type: "Congelado" | "Resfriado" | "Seco";
  cost_price: string;
  price: string;
  stock: number;
  min_stock: number;
  unit: string;
  batch_number: string;
  manufacturing_date: string;
  expiration_date: string;
  // CAMPOS DE COMISSÃO
  commission_type: "fixed" | "percentage";
  commission_value: string;
};

const CATEGORIAS_PADRAO = [
  "Aves",
  "Bovinos",
  "Suínos",
  "Embutidos",
  "Queijos",
  "Laticínios",
  "Pescados",
  "Vegetais Congelados",
  "Diversos",
];

export function ProductModal({
  productToEdit,
  onClose,
  onSuccess,
}: {
  productToEdit?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [submitError, setSubmitError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    defaultValues: {
      unit: "kg",
      stock: 0,
      min_stock: 15,
      storage_type: "Resfriado",
      cost_price: "0,00",
      price: "0,00",
      category: "",
      commission_type: "percentage",
      commission_value: "0,00",
    },
  });

  useEffect(() => {
    if (productToEdit) {
      reset({
        name: productToEdit.name || "",
        sku: productToEdit.sku || "",
        category: productToEdit.category || "",
        storage_type: (productToEdit.storage_type as any) || "Resfriado",
        cost_price: productToEdit.cost_price
          ? productToEdit.cost_price.toFixed(2).replace(".", ",")
          : "0,00",
        price: productToEdit.price
          ? productToEdit.price.toFixed(2).replace(".", ",")
          : "0,00",
        stock: productToEdit.stock || 0,
        min_stock: productToEdit.min_stock || 15,
        unit: productToEdit.unit || "kg",
        batch_number: productToEdit.batch_number || "",
        manufacturing_date: productToEdit.manufacturing_date || "",
        expiration_date: productToEdit.expiration_date || "",
        // CARREGA COMISSÃO
        commission_type: productToEdit.commission_type || "percentage",
        commission_value: productToEdit.commission_value
          ? productToEdit.commission_value.toFixed(2).replace(".", ",")
          : "0,00",
      });
      if (productToEdit.img) {
        setImagePreview(productToEdit.img);
      }
    }
  }, [productToEdit, reset]);

  const costVal =
    parseFloat(
      (watch("cost_price") || "0").replace(/\./g, "").replace(",", "."),
    ) || 0;
  const saleVal =
    parseFloat((watch("price") || "0").replace(/\./g, "").replace(",", ".")) ||
    0;
  const margin =
    saleVal > 0 ? (((saleVal - costVal) / saleVal) * 100).toFixed(1) : "0";

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: ProductFormData) => {
    setSubmitError("");
    setIsUploading(true);
    try {
      let imageUrl = productToEdit?.img || null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("produtos")
          .upload(fileName, imageFile);

        if (uploadError) throw new Error("Erro ao fazer upload da imagem.");

        if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from("produtos")
            .getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      } else if (!imagePreview) {
        imageUrl = null;
      }

      const numericPrice = parseFloat(
        data.price.replace(/\./g, "").replace(",", "."),
      );
      const numericCost = parseFloat(
        data.cost_price.replace(/\./g, "").replace(",", "."),
      );
      const numericCommission = parseFloat(
        data.commission_value.replace(/\./g, "").replace(",", "."),
      );

      const payload = {
        name: data.name,
        sku: data.sku || null,
        category: data.category,
        storage_type: data.storage_type,
        cost_price: numericCost,
        price: numericPrice,
        stock: data.stock,
        min_stock: data.min_stock,
        unit: data.unit,
        batch_number: data.batch_number || null,
        manufacturing_date: data.manufacturing_date || null,
        expiration_date: data.expiration_date || null,
        img: imageUrl,
        commission_type: data.commission_type,
        commission_value: numericCommission,
      };

      if (productToEdit) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", productToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([payload]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      if (error.code === "23505")
        setSubmitError("Já existe um produto com este código SKU.");
      else
        setSubmitError(
          error.message || "Erro ao salvar produto. Verifique os dados.",
        );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div
        className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {productToEdit ? "Editar Produto" : "Novo Produto Perecível"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Controle de estoque, lote, validade e precificação
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

        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {submitError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {submitError}
            </div>
          )}

          <form
            id="product-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-8"
          >
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <ImagePlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Foto do Produto
                </h3>
              </div>
              <div className="flex items-center gap-6">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                {imagePreview ? (
                  <div className="relative w-32 h-32 rounded-2xl border-2 border-primary/20 overflow-hidden group shadow-sm">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={removeImage}
                        className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                  >
                    <UploadCloud className="w-8 h-8 opacity-50" />
                    <span className="text-[10px] font-medium text-center px-2">
                      Clique para
                      <br />
                      enviar foto
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Identificação do Item
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Nome Comercial *
                  </label>
                  <input
                    {...register("name", { required: "Nome obrigatório" })}
                    placeholder="Ex: Queijo Mussarela Fatiado 1kg"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Código / SKU
                  </label>
                  <input
                    {...register("sku")}
                    placeholder="Ex: FRI-MUS-01"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="sm:col-span-6">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Categoria *
                  </label>
                  <select
                    {...register("category", {
                      required: "Selecione uma categoria",
                    })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Selecione...</option>
                    {CATEGORIAS_PADRAO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-6">
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-500" />{" "}
                    Conservação
                  </label>
                  <select
                    {...register("storage_type", { required: true })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="Resfriado">Resfriado (0°C a 4°C)</option>
                    <option value="Congelado">Congelado (-18°C)</option>
                    <option value="Seco">Seco / Ambiente</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Rastreabilidade & Validade
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Lote
                  </label>
                  <input
                    {...register("batch_number")}
                    placeholder="EX: L2508-01"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Fabricação
                  </label>
                  <input
                    type="date"
                    {...register("manufacturing_date")}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-red-600 mb-1">
                    Validade *
                  </label>
                  <input
                    type="date"
                    {...register("expiration_date", {
                      required: "Validade obrigatória",
                    })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <DollarSign className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Custos, Comissão & Estoque
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Custo (R$)
                  </label>
                  <input
                    {...register("cost_price")}
                    placeholder="0,00"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Venda (R$) *
                  </label>
                  <input
                    {...register("price", { required: true })}
                    placeholder="0,00"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Margem Bruta
                  </label>
                  <div className="w-full px-3 py-2.5 rounded-lg border border-transparent bg-secondary text-sm font-bold flex items-center">
                    {margin}%
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Unidade
                  </label>
                  <select
                    {...register("unit")}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="kg">Quilograma (kg)</option>
                    <option value="un">Unidade (un)</option>
                    <option value="cx">Caixa (cx)</option>
                    <option value="pct">Pacote (pct)</option>
                    <option value="g">Grama (g)</option>
                  </select>
                </div>

                {/* === CAIXA DE COMISSÃO DESTAQUE === */}
                <div className="sm:col-span-2 bg-blue-50/60 p-4 rounded-xl border border-blue-200">
                  <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                    Comissão do Vendedor
                  </label>
                  <div className="flex gap-2">
                    <select
                      {...register("commission_type")}
                      className="w-1/2 px-3 py-2.5 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="percentage">% Porcentagem</option>
                      <option value="fixed">R$ Fixo (por item)</option>
                    </select>
                    <input
                      {...register("commission_value")}
                      placeholder="0,00"
                      className="w-1/2 px-3 py-2.5 rounded-lg border border-blue-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    {...register("stock", { valueAsNumber: true })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Mín. (Alerta)
                  </label>
                  <input
                    type="number"
                    {...register("min_stock", { valueAsNumber: true })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
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
            form="product-form"
            disabled={isSubmitting || isUploading}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-[#163318] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
          >
            {isSubmitting || isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />{" "}
                {productToEdit ? "Salvar Alterações" : "Salvar Produto"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
