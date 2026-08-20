"use client";

import { useState } from "react";
import { Search, Plus, Download, Edit2, RefreshCw, AlertTriangle } from "lucide-react";
import { StockBadge } from "@/components/ui/Badge";
import { products } from "@/data/products";

export function Produtos() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = products.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter === "Todos" || p.category === catFilter;
    return ms && mc;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Produtos & Estoque</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} produtos no catálogo</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </div>

      {products.some(p => p.stock < 15) && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span><strong>Atenção:</strong> {products.filter(p => p.stock < 15).length} produto(s) com estoque crítico. Solicite reposição imediata.</span>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap gap-y-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-2 text-xs font-medium transition-colors ${catFilter === c ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr>
                {["Produto", "Categoria", "Preço / kg", "Estoque", "Status", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground py-3 px-4 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        <img src={`https://images.unsplash.com/${p.img}?w=80&h=80&fit=crop&auto=format`} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-foreground">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{p.category}</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-foreground">{p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td className="py-3.5 px-4 font-mono text-sm text-muted-foreground">{p.stock} {p.unit}</td>
                  <td className="py-3.5 px-4"><StockBadge qty={p.stock} /></td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><RefreshCw className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {filtered.map(p => (
            <div key={p.id} className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                <img src={`https://images.unsplash.com/${p.img}?w=96&h=96&fit=crop&auto=format`} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category} · {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/kg</p>
              </div>
              <StockBadge qty={p.stock} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
