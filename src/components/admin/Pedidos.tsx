"use client";

import { useState } from "react";
import { Search, X, Trash2, CheckCircle, Package } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { clients } from "@/data/clients";
import { products } from "@/data/products";
import { fmt } from "@/utils/format";
import type { Client, Product, OrderItem } from "@/types";

export function Pedidos() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [confirmed, setConfirmed] = useState(false);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) && c.status === "Ativo"
  );
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );
  const subtotal = orderItems.reduce((a, i) => a + i.qty * i.price, 0);
  const discountVal = (subtotal * parseFloat(discount || "0")) / 100;
  const total = subtotal - discountVal;

  function addProduct(p: Product) {
    setOrderItems(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) return prev.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, qty: 1, price: p.price }];
    });
    setProductSearch("");
  }

  function updateQty(id: number, qty: number) {
    if (qty <= 0) setOrderItems(prev => prev.filter(i => i.productId !== id));
    else setOrderItems(prev => prev.map(i => i.productId === id ? { ...i, qty } : i));
  }

  if (confirmed) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Pedido Confirmado!</h2>
      <p className="text-sm text-muted-foreground max-w-xs">O pedido para <strong>{selectedClient?.name}</strong> foi registrado com sucesso. Total: <strong>{fmt(total)}</strong></p>
      <button onClick={() => { setConfirmed(false); setSelectedClient(null); setOrderItems([]); setClientSearch(""); setDiscount("0"); }}
        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors">
        Novo Pedido
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Nova Venda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Criação rápida de pedido</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Step 1: Client */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</div>
              <h3 className="text-sm font-semibold text-foreground">Selecionar Cliente</h3>
            </div>
            {selectedClient ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                <Avatar initials={selectedClient.name.slice(0, 2).toUpperCase()} color="bg-[#1e4023]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selectedClient.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedClient.doc} · {selectedClient.city}</p>
                </div>
                <button onClick={() => setSelectedClient(null)} className="p-1 rounded hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); }} onFocus={() => setShowClientDrop(true)}
                  placeholder="Buscar por nome ou CNPJ..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
                {showClientDrop && clientSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                    {filteredClients.slice(0, 5).map(c => (
                      <button key={c.id} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                        onClick={() => { setSelectedClient(c); setClientSearch(""); setShowClientDrop(false); }}>
                        <Avatar initials={c.name.slice(0, 2).toUpperCase()} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.doc}</p>
                        </div>
                      </button>
                    ))}
                    {filteredClients.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum cliente encontrado</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Products */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</div>
              <h3 className="text-sm font-semibold text-foreground">Adicionar Produtos</h3>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar produto pelo nome..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              {productSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                  {filteredProducts.slice(0, 5).map(p => (
                    <button key={p.id} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                      onClick={() => addProduct(p)}>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category} · {p.stock} {p.unit} disponíveis</p>
                      </div>
                      <span className="text-sm font-semibold text-primary flex-shrink-0">{fmt(p.price)}/{p.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {orderItems.length > 0 ? (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs text-muted-foreground font-medium py-2 px-1">Produto</th>
                      <th className="text-center text-xs text-muted-foreground font-medium py-2 px-1 w-24">Qtd (kg)</th>
                      <th className="text-right text-xs text-muted-foreground font-medium py-2 px-1 w-24">Unit.</th>
                      <th className="text-right text-xs text-muted-foreground font-medium py-2 px-1 w-24">Subtotal</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map(item => (
                      <tr key={item.productId} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="py-2.5 px-1 font-medium text-foreground">{item.name}</td>
                        <td className="py-2.5 px-1">
                          <input type="number" min={1} value={item.qty}
                            onChange={e => updateQty(item.productId, parseInt(e.target.value) || 0)}
                            className="w-full text-center px-2 py-1 rounded border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </td>
                        <td className="py-2.5 px-1 text-right text-muted-foreground">{fmt(item.price)}</td>
                        <td className="py-2.5 px-1 text-right font-semibold text-foreground">{fmt(item.qty * item.price)}</td>
                        <td className="py-2.5 pl-2">
                          <button onClick={() => updateQty(item.productId, 0)} className="p-1 rounded hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Package className="w-8 h-8 opacity-30" />
                <p className="text-sm">Nenhum produto adicionado</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Summary */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm sticky top-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</div>
              <h3 className="text-sm font-semibold text-foreground">Resumo do Pedido</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Itens ({orderItems.length})</span>
                <span>{orderItems.reduce((a, i) => a + i.qty, 0)} unidades</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{fmt(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Desconto (%)</span>
                <input type="number" min={0} max={30} value={discount} onChange={e => setDiscount(e.target.value)}
                  className="w-20 text-center px-2 py-1 rounded border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-red-500 text-xs">
                  <span>Desconto aplicado</span>
                  <span>- {fmt(discountVal)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="font-semibold text-foreground">Total Final</span>
                <span className="text-xl font-bold text-primary">{fmt(total)}</span>
              </div>
            </div>
            <button disabled={!selectedClient || orderItems.length === 0} onClick={() => setConfirmed(true)}
              className="mt-5 w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-[#163318] active:bg-[#0f2210] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Confirmar Venda
            </button>
            {(!selectedClient || orderItems.length === 0) && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {!selectedClient ? "Selecione um cliente" : "Adicione ao menos um produto"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
