"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  Edit2,
  AlertTriangle,
  PackageOpen,
  Calendar,
  Snowflake,
  Filter,
} from "lucide-react";
import { StockBadge } from "@/components/ui/Badge";
import { ProductModal } from "@/components/ui/ProductModal";
import { supabase } from "@/utils/supabase";
import type { Product } from "@/types";
import { fmt } from "@/utils/format";

export function Produtos() {
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [stockFilter, setStockFilter] = useState<"Todos" | "Critico" | "OK">(
    "Todos",
  );
  const [expiryDaysFilter, setExpiryDaysFilter] = useState<string>("Todos");

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });
    if (!error && data) setDbProducts(data as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(dbProducts.map((p) => p.category).filter(Boolean)),
    );
    return ["Todos", ...cats];
  }, [dbProducts]);

  // Função para calcular os dias exatos até o vencimento
  const getDaysToExpiry = (dateStr?: string) => {
    if (!dateStr) return null;
    const expiryDate = new Date(dateStr + "T00:00:00").getTime();
    const today = new Date().getTime();
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Aplicação de todos os filtros juntos
  const filtered = dbProducts.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.batch_number &&
        p.batch_number.toLowerCase().includes(search.toLowerCase()));
    const matchCat = catFilter === "Todos" || p.category === catFilter;
    const matchStock =
      stockFilter === "Todos" ||
      (stockFilter === "Critico"
        ? p.stock <= (p.min_stock || 15)
        : p.stock > (p.min_stock || 15));

    let matchExpiry = true;
    if (expiryDaysFilter !== "Todos") {
      const daysToExpiry = getDaysToExpiry(p.expiration_date);
      if (daysToExpiry === null) {
        matchExpiry = false; // Se o filtro está ativo, esconde produtos sem validade
      } else {
        const maxDays = parseInt(expiryDaysFilter);
        if (maxDays === 0) {
          matchExpiry = daysToExpiry < 0; // Vencidos
        } else {
          matchExpiry = daysToExpiry >= 0 && daysToExpiry <= maxDays; // Vence no intervalo
        }
      }
    }

    return matchSearch && matchCat && matchStock && matchExpiry;
  });

  const criticalStockCount = dbProducts.filter(
    (p) => p.stock <= (p.min_stock || 15),
  ).length;

  // FUNÇÃO DE EXPORTAÇÃO PARA EXCEL/CSV
  const exportToCSV = () => {
    const headers = [
      "Nome do Produto",
      "SKU",
      "Categoria",
      "Armazenamento",
      "Lote",
      "Validade",
      "Custo (R$)",
      "Venda (R$)",
      "Estoque",
      "Unidade",
    ];
    const rows = filtered.map((p) => [
      `"${p.name}"`,
      `"${p.sku || ""}"`,
      `"${p.category}"`,
      `"${p.storage_type}"`,
      `"${p.batch_number || "S/L"}"`,
      `"${p.expiration_date ? new Date(p.expiration_date + "T00:00:00").toLocaleDateString("pt-BR") : "Indeterminada"}"`,
      p.cost_price?.toString().replace(".", ",") || "0,00",
      p.price?.toString().replace(".", ",") || "0,00",
      p.stock,
      `"${p.unit}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Relatorio_Produtos_${new Date().toLocaleDateString("pt-BR")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {(isModalOpen || editingProduct) && (
        <ProductModal
          productToEdit={editingProduct}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          onSuccess={fetchProducts}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Produtos & Estoque
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} produtos filtrados no catálogo
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground bg-card hover:bg-secondary transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-primary" /> Exportar (Excel)
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo Produto
            </button>
          </div>
        </div>

        {criticalStockCount > 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>
              <strong>Atenção Operacional:</strong> {criticalStockCount}{" "}
              produto(s) na base geral estão abaixo do estoque de segurança.
            </span>
          </div>
        )}

        {/* Barra de Filtros Avançados */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou Lote..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-sm">
              <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />

              <select
                value={stockFilter}
                onChange={(e: any) => setStockFilter(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer text-foreground"
              >
                <option value="Todos">Todo Estoque</option>
                <option value="Critico">Estoque Crítico</option>
                <option value="OK">Estoque Normal</option>
              </select>

              <select
                value={expiryDaysFilter}
                onChange={(e: any) => setExpiryDaysFilter(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer text-foreground"
              >
                <option value="Todos">Toda Validade</option>
                <option value="0">Produtos Vencidos</option>
                <option value="15">Vence em até 15 dias</option>
                <option value="30">Vence em até 30 dias</option>
                <option value="60">Vence em até 60 dias</option>
                <option value="90">Vence em até 90 dias</option>
              </select>
            </div>
          </div>

          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${catFilter === c ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:bg-secondary"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Listagem de Produtos */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* VERSÃO DESKTOP (Tabela) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr>
                      {[
                        "Produto / SKU",
                        "Categoria & Armazenamento",
                        "Lote & Validade",
                        "Preço (Venda/Custo)",
                        "Estoque",
                        "Ação",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-semibold text-muted-foreground py-3 px-4 uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const daysToExpiry = getDaysToExpiry(p.expiration_date);
                      const isExpired =
                        daysToExpiry !== null && daysToExpiry < 0;
                      const isNearExpiry =
                        daysToExpiry !== null &&
                        daysToExpiry >= 0 &&
                        daysToExpiry <= 15;

                      return (
                        <tr
                          key={p.id}
                          className="border-t border-border/50 hover:bg-secondary/20 transition-colors group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg border border-border/50 overflow-hidden flex-shrink-0 flex items-center justify-center bg-white shadow-sm">
                                {p.img ? (
                                  <img
                                    src={p.img}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <PackageOpen className="w-5 h-5 text-muted-foreground/50" />
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-foreground block">
                                  {p.name}
                                </span>
                                {p.sku && (
                                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {p.sku}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-foreground">
                                {p.category}
                              </span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Snowflake className="w-2.5 h-2.5 text-blue-500" />{" "}
                                {p.storage_type || "Resfriado"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5 font-mono text-xs">
                              <span className="text-muted-foreground font-semibold">
                                Lote: {p.batch_number || "S/L"}
                              </span>
                              <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {p.expiration_date
                                  ? new Date(
                                      p.expiration_date + "T00:00:00",
                                    ).toLocaleDateString("pt-BR")
                                  : "Indeterminada"}
                                {isExpired && (
                                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">
                                    Vencido!
                                  </span>
                                )}
                                {isNearExpiry && (
                                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">
                                    Vence Logo
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-primary">
                                {fmt(p.price)}
                              </span>
                              {p.cost_price ? (
                                <span className="text-[10px] text-muted-foreground">
                                  Custo: {fmt(p.cost_price)}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold">
                                {p.stock} {p.unit}
                              </span>
                              <StockBadge qty={p.stock} />
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setEditingProduct(p)}
                              title="Editar Produto"
                              className="p-2 rounded-lg bg-card border border-border hover:border-primary hover:text-primary transition-all opacity-60 group-hover:opacity-100 shadow-sm"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* VERSÃO MOBILE (Cards) */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((p) => {
                  const daysToExpiry = getDaysToExpiry(p.expiration_date);
                  const isExpired = daysToExpiry !== null && daysToExpiry < 0;
                  const isNearExpiry =
                    daysToExpiry !== null &&
                    daysToExpiry >= 0 &&
                    daysToExpiry <= 15;

                  return (
                    <div key={p.id} className="p-4 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl border border-border/50 bg-white flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                            {p.img ? (
                              <img
                                src={p.img}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <PackageOpen className="w-6 h-6 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              {p.category} <span className="opacity-40">•</span>{" "}
                              <Snowflake className="w-2.5 h-2.5 text-blue-500" />{" "}
                              {p.storage_type || "Resfriado"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">
                            {p.stock} {p.unit}
                          </span>
                          <StockBadge qty={p.stock} />
                        </div>
                        <span className="font-bold text-primary text-base">
                          {fmt(p.price)}
                        </span>
                      </div>

                      <div className="bg-secondary/30 rounded-xl p-3 flex items-center justify-between text-xs border border-border">
                        <div className="flex flex-col gap-1 font-mono">
                          <span className="text-muted-foreground font-semibold">
                            Lote: {p.batch_number || "S/L"}
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {p.expiration_date
                              ? new Date(
                                  p.expiration_date + "T00:00:00",
                                ).toLocaleDateString("pt-BR")
                              : "Indeterminada"}
                            {isExpired && (
                              <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Vencido!
                              </span>
                            )}
                            {isNearExpiry && (
                              <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Vence Logo
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="px-4 py-2 rounded-lg border border-border bg-card text-foreground font-semibold hover:bg-secondary transition-colors shadow-sm active:scale-95 flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <PackageOpen className="w-10 h-10 opacity-20" />
                  <p className="text-sm">
                    Nenhum produto encontrado com os filtros atuais.
                  </p>
                  <button
                    onClick={() => {
                      setSearch("");
                      setCatFilter("Todos");
                      setStockFilter("Todos");
                      setExpiryDaysFilter("Todos");
                    }}
                    className="text-primary text-sm font-semibold hover:underline"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
