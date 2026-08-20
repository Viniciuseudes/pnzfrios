"use client";

import { useState } from "react";
import { Search, Plus, Phone, MapPin, Eye, Edit2 } from "lucide-react";
import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ClientModal } from "@/components/ui/ClientModal";
import { clients } from "@/data/clients";

export function Clientes() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Todos" | "Ativo" | "Inativo">("Todos");
  const [showModal, setShowModal] = useState(false);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.doc.includes(search);
    const matchFilter = filter === "Todos" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <>
      {showModal && <ClientModal onClose={() => setShowModal(false)} />}
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{clients.length} clientes cadastrados</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors shadow-sm flex-shrink-0">
            <Plus className="w-4 h-4" /> Cadastrar Cliente
          </button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap gap-y-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CNPJ..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["Todos", "Ativo", "Inativo"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}>{f}</button>
              ))}
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr>
                  {["Nome / Razão Social", "CNPJ / CPF", "Telefone", "Cidade", "Status", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground py-3 px-4 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-t border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={c.name.slice(0, 2).toUpperCase()} color="bg-[#1e4023]" />
                        <div>
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">{c.doc}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{c.phone}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{c.city}</td>
                    <td className="py-3.5 px-4"><Badge status={c.status} /></td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-border">
            {filtered.map(c => (
              <div key={c.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar initials={c.name.slice(0, 2).toUpperCase()} color="bg-[#1e4023]" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.doc}</p>
                    </div>
                  </div>
                  <Badge status={c.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pl-10">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Users className="w-8 h-8 opacity-30" />
              <p className="text-sm">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
