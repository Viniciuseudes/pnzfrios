"use client";
import { useState, useEffect } from "react";
import { Search, Plus, Phone, MapPin, Eye, Edit2, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ClientModal } from "@/components/ui/ClientModal";
import { ClientViewModal } from "@/components/ui/ClientViewModal"; // <-- Importe o novo modal
import { supabase } from "@/utils/supabase";
import type { Client } from "@/types";

export function Clientes() {
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Todos" | "Ativo" | "Inativo">("Todos");

  // Estados para gerenciar qual modal está aberto
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  async function fetchClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Erro ao buscar clientes:", error);
    } else {
      setDbClients(data as Client[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = dbClients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.doc && c.doc.includes(search));
    const matchFilter = filter === "Todos" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <>
      {/* Modal de Criação / Edição */}
      {(isCreateModalOpen || editingClient) && (
        <ClientModal
          clientToEdit={editingClient}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingClient(null);
          }}
          onSuccess={fetchClients}
        />
      )}

      {/* Modal de Visão 360º (Customer View) */}
      {viewingClient && (
        <ClientViewModal
          client={viewingClient}
          onClose={() => setViewingClient(null)}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dbClients.length} clientes cadastrados na base
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors shadow-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Cadastrar Cliente
          </button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap gap-y-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou documento..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["Todos", "Ativo", "Inativo"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* VERSÃO DESKTOP */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr>
                      {[
                        "Nome / Razão Social",
                        "Documento",
                        "Telefone",
                        "Cidade",
                        "Status",
                        "Ações",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`text-left text-xs font-semibold text-muted-foreground py-3 px-4 uppercase tracking-wide ${h === "Ações" ? "text-right" : ""}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-border/50 hover:bg-secondary/20 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              initials={c.name.slice(0, 2).toUpperCase()}
                              color="bg-[#1e4023]"
                            />
                            <div>
                              <p className="font-medium text-foreground">
                                {c.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {c.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                          {c.doc || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {c.phone || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {c.city || "-"}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge status={c.status as any} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            {/* BOTÕES AGORA FUNCIONAM */}
                            <button
                              onClick={() => setViewingClient(c)}
                              title="Visão 360 do Cliente"
                              className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingClient(c)}
                              title="Editar Dados"
                              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* VERSÃO MOBILE */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((c) => (
                  <div key={c.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          initials={c.name.slice(0, 2).toUpperCase()}
                          color="bg-[#1e4023]"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {c.doc}
                          </p>
                        </div>
                      </div>
                      <Badge status={c.status as any} />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/50">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {c.phone || "-"}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {c.city || "-"}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setViewingClient(c)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Histórico
                      </button>
                      <button
                        onClick={() => setEditingClient(c)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
