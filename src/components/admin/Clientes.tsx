"use client";
import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Phone,
  MapPin,
  Eye,
  Edit2,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ClientModal } from "@/components/ui/ClientModal";
import { ClientViewModal } from "@/components/ui/ClientViewModal";
import { supabase } from "@/utils/supabase";
import type { Client } from "@/types";

type RecencyStatus = "active" | "warning" | "danger" | "never";

interface ClientWithRecency extends Client {
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  recencyStatus: RecencyStatus;
}

export function Clientes() {
  const [dbClients, setDbClients] = useState<ClientWithRecency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Todos" | "Ativo" | "Inativo">("Todos");
  const [recencyFilter, setRecencyFilter] = useState<
    "all" | "warning" | "danger"
  >("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  async function fetchClients() {
    setLoading(true);
    try {
      // 1. Busca todos os clientes e as datas dos seus pedidos válidos
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          *,
          orders (
            created_at,
            status
          )
        `,
        )
        .order("id", { ascending: false });

      if (error) throw error;

      const now = new Date().getTime();

      // 2. Calcula a Recência em dias
      const enrichedClients: ClientWithRecency[] = (data || []).map(
        (c: any) => {
          const validOrders = (c.orders || []).filter(
            (o: any) => o.status !== "cancelado",
          );

          if (validOrders.length === 0) {
            return {
              ...c,
              lastOrderDate: null,
              daysSinceLastOrder: null,
              recencyStatus: "never" as RecencyStatus,
            };
          }

          // Ordena para pegar a data do pedido mais recente
          const sortedDates = validOrders
            .map((o: any) => new Date(o.created_at).getTime())
            .sort((a: number, b: number) => b - a);

          const latestOrderTime = sortedDates[0];
          const days = Math.floor(
            (now - latestOrderTime) / (1000 * 60 * 60 * 24),
          );

          let recencyStatus: RecencyStatus = "active";
          if (days >= 30) {
            recencyStatus = "danger";
          } else if (days >= 15) {
            recencyStatus = "warning";
          }

          return {
            ...c,
            lastOrderDate: new Date(latestOrderTime).toISOString(),
            daysSinceLastOrder: days,
            recencyStatus,
          };
        },
      );

      setDbClients(enrichedClients);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = dbClients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.doc && c.doc.includes(search)) ||
      (c.city && c.city.toLowerCase().includes(search.toLowerCase()));

    const matchFilter = filter === "Todos" || c.status === filter;

    const matchRecency =
      recencyFilter === "all" || c.recencyStatus === recencyFilter;

    return matchSearch && matchFilter && matchRecency;
  });

  const warningCount = dbClients.filter(
    (c) => c.recencyStatus === "warning",
  ).length;
  const dangerCount = dbClients.filter(
    (c) => c.recencyStatus === "danger",
  ).length;

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

      {/* Modal de Visão 360º */}
      {viewingClient && (
        <ClientViewModal
          client={viewingClient}
          onClose={() => setViewingClient(null)}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Gestão de Clientes & Recência
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dbClients.length} clientes cadastrados na base ativa
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors shadow-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Cadastrar Cliente
          </button>
        </div>

        {/* CARDS DE INTELIGÊNCIA COMERCIAL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() =>
              setRecencyFilter(recencyFilter === "warning" ? "all" : "warning")
            }
            className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
              recencyFilter === "warning"
                ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20"
                : "bg-card border-border hover:bg-secondary/30"
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                Atenção (15 a 29 dias)
              </p>
              <p className="text-2xl font-black text-foreground mt-0.5">
                {warningCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Sem pedidos recentes
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </button>

          <button
            onClick={() =>
              setRecencyFilter(recencyFilter === "danger" ? "all" : "danger")
            }
            className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
              recencyFilter === "danger"
                ? "bg-red-500/10 border-red-500 ring-2 ring-red-500/20"
                : "bg-card border-border hover:bg-secondary/30"
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                Risco de Perda (30+ dias)
              </p>
              <p className="text-2xl font-black text-foreground mt-0.5">
                {dangerCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Urgente: Reativar contato
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </button>

          <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Carteira Saudável (&lt;15 dias)
              </p>
              <p className="text-2xl font-black text-[#1e4023] mt-0.5">
                {dbClients.filter((c) => c.recencyStatus === "active").length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Comprando regularmente
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-border flex-wrap gap-y-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, documento ou cidade..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {recencyFilter !== "all" && (
                <button
                  onClick={() => setRecencyFilter("all")}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-foreground hover:bg-muted transition"
                >
                  Limpar filtro de risco ✕
                </button>
              )}

              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["Todos", "Ativo", "Inativo"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
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
                        "Cliente",
                        "Documento",
                        "Telefone",
                        "Cidade",
                        "Recência / Última Compra",
                        "Status",
                        "Ações",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`text-left text-xs font-semibold text-muted-foreground py-3 px-4 uppercase tracking-wide ${
                            h === "Ações" ? "text-right" : ""
                          }`}
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
                                {c.email || "Sem e-mail"}
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

                        {/* COLUNA DE RECÊNCIA INTELIGENTE */}
                        <td className="py-3.5 px-4">
                          {c.recencyStatus === "never" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">
                              <HelpCircle className="w-3.5 h-3.5 opacity-50" />{" "}
                              Sem compras
                            </span>
                          ) : c.recencyStatus === "danger" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              {c.daysSinceLastOrder} dias sem comprar
                            </span>
                          ) : c.recencyStatus === "warning" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              {c.daysSinceLastOrder} dias sem comprar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              {c.daysSinceLastOrder === 0
                                ? "Comprou hoje"
                                : `${c.daysSinceLastOrder}d atrás`}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge status={c.status as any} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
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

                    {/* ALERTA DE RECÊNCIA NO CARD MOBILE */}
                    <div className="pt-1">
                      {c.recencyStatus === "danger" ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Risco: {c.daysSinceLastOrder} dias sem comprar
                          </span>
                        </div>
                      ) : c.recencyStatus === "warning" ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Atenção: {c.daysSinceLastOrder} dias sem comprar
                          </span>
                        </div>
                      ) : null}
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
                  <p className="text-sm">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
