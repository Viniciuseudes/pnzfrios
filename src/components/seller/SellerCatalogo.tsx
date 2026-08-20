"use client";

import { useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import { StockBadge } from "@/components/ui/Badge";
import { products } from "@/data/products";
import { fmt } from "@/utils/format";

export function SellerCatalogo() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [cart, setCart] = useState<Record<number, number>>({});
  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = products.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter === "Todos" || p.category === catFilter;
    return ms && mc;
  });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = products.reduce((a, p) => a + (cart[p.id] ?? 0) * p.price, 0);

  function toggle(id: number) {
    setCart(c => c[id] ? { ...c, [id]: 0 } : { ...c, [id]: 1 });
  }
  function adj(id: number, delta: number) {
    setCart(c => { const n = Math.max(0, (c[id] ?? 0) + delta); return { ...c, [id]: n }; });
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Catálogo de Produtos</h2>
        <p className="text-xs text-muted-foreground">Toque para adicionar ao pedido</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${catFilter === c ? "bg-[#1e4023] text-white shadow-sm" : "bg-card border border-border text-muted-foreground"}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {filtered.map(p => {
          const qty = cart[p.id] ?? 0;
          const critical = p.stock < 15;
          return (
            <div key={p.id} className={`bg-card rounded-2xl border overflow-hidden shadow-sm transition-all ${qty > 0 ? "border-[#1e4023] ring-1 ring-[#1e4023]/20" : "border-border"}`}>
              <div className="relative h-28 bg-muted">
                <img src={`https://images.unsplash.com/${p.img}?w=200&h=112&fit=crop&auto=format`} alt={p.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2"><StockBadge qty={p.stock} /></div>
                {qty > 0 && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#1e4023] text-white text-[10px] font-bold flex items-center justify-center">{qty}</div>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-foreground leading-tight mb-0.5 line-clamp-2">{p.name}</p>
                <p className="text-[10px] text-muted-foreground mb-2">{p.category}</p>
                <p className="text-sm font-black text-[#1e4023] mb-3">{fmt(p.price)}<span className="text-[10px] font-normal text-muted-foreground">/{p.unit}</span></p>
                {qty === 0 ? (
                  <button onClick={() => toggle(p.id)} disabled={critical && p.stock === 0}
                    className="w-full py-2 rounded-xl bg-[#1e4023] text-white text-xs font-semibold hover:bg-[#163318] active:scale-95 transition-all disabled:opacity-40">
                    + Adicionar
                  </button>
                ) : (
                  <div className="flex items-center justify-between bg-muted rounded-xl px-2 py-1">
                    <button onClick={() => adj(p.id, -1)} className="w-7 h-7 rounded-lg bg-card flex items-center justify-center text-foreground font-bold text-lg hover:bg-secondary transition-colors">−</button>
                    <span className="text-sm font-bold text-foreground">{qty}</span>
                    <button onClick={() => adj(p.id, 1)} className="w-7 h-7 rounded-lg bg-[#1e4023] flex items-center justify-center text-white font-bold text-sm hover:bg-[#163318] transition-colors">+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {cartCount > 0 && (
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed bottom-20 left-4 right-4 z-30">
          <div className="bg-[#1e4023] rounded-2xl p-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{cartCount} {cartCount === 1 ? "produto" : "produtos"}</p>
                <p className="text-white/60 text-xs">{fmt(cartTotal)}</p>
              </div>
            </div>
            <button className="bg-[#c8921c] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#b07818] transition-colors">
              Fechar Pedido →
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
