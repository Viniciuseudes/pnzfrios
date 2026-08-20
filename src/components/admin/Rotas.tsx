"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Route,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Navigation,
  MapPin,
  Calendar,
  Timer,
  Flag,
  Search,
  StickyNote,
  X,
  CheckSquare,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  User2,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import type { SalesRoute, RouteStop, Client, Seller } from "@/types";

// Fallbacks de cores caso não existam no utils
const STATUS_COLORS: Record<string, string> = {
  Rascunho: "bg-gray-50 text-gray-600 border-gray-200",
  Ativa: "bg-blue-50 text-blue-600 border-blue-200",
  Concluída: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  Normal: "bg-gray-50 text-gray-600 border-gray-200",
  Urgente: "bg-red-50 text-red-600 border-red-200",
};

function RouteStopRow({
  stop,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  onObsChange,
}: {
  stop: RouteStop;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onObsChange: (v: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 items-start p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
    >
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-[#1e4023] text-white text-xs font-bold flex items-center justify-center">
          {index + 1}
        </div>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {stop.clientName}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {stop.city}
              <span className="mx-1 opacity-30">•</span>
              <Clock className="w-3 h-3" />
              {stop.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative">
          <StickyNote className="absolute left-2.5 top-2.5 w-3 h-3 text-muted-foreground/50" />
          <input
            value={stop.observation || ""}
            onChange={(e) => onObsChange(e.target.value)}
            placeholder="Observação desta parada..."
            className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-input-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
      </div>
    </motion.div>
  );
}

export function Rotas() {
  const [dbRoutes, setDbRoutes] = useState<SalesRoute[]>([]);
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [dbSellers, setDbSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("Todas");

  const blankForm = (): Omit<SalesRoute, "id"> => ({
    name: "",
    date: "",
    startTime: "08:00",
    sellerId: 0,
    sellerName: "",
    sellerAvatar: "",
    stops: [],
    notes: "",
    status: "Rascunho",
    priority: "Normal",
  });

  const [form, setForm] = useState(blankForm());
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDrop, setShowClientDrop] = useState(false);

  async function fetchData() {
    setLoading(true);

    // Busca Rotas (com relacionamentos profundos), Clientes e Vendedores simultaneamente
    const [routesRes, clientsRes, sellersRes] = await Promise.all([
      supabase
        .from("routes")
        .select(
          `
        *,
        sellers ( name, avatar ),
        route_stops (
          id, stop_order, observation, status, client_id,
          clients ( name, city, phone )
        )
      `,
        )
        .order("id", { ascending: false }),
      supabase.from("clients").select("*").eq("status", "Ativo"),
      supabase.from("sellers").select("*"),
    ]);

    if (clientsRes.data) setDbClients(clientsRes.data as Client[]);
    if (sellersRes.data) setDbSellers(sellersRes.data as Seller[]);

    if (routesRes.data) {
      const formattedRoutes: SalesRoute[] = routesRes.data.map((r: any) => ({
        id: r.id,
        name: r.name,
        date: r.route_date,
        startTime: r.start_time,
        sellerId: r.seller_id,
        sellerName: r.sellers?.name || "Desconhecido",
        sellerAvatar: r.sellers?.avatar || "--",
        status: r.status,
        priority: r.priority,
        notes: r.notes || "",
        // Ordena as paradas e formata
        stops: (r.route_stops || [])
          .sort((a: any, b: any) => a.stop_order - b.stop_order)
          .map((s: any) => ({
            id: s.id,
            clientId: s.client_id,
            clientName: s.clients?.name || "Cliente Excluído",
            city: s.clients?.city || "--",
            phone: s.clients?.phone || "--",
            order: s.stop_order,
            observation: s.observation || "",
            status: s.status,
          })),
      }));
      setDbRoutes(formattedRoutes);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openNew() {
    setForm(blankForm());
    setEditingId(null);
    setMode("form");
  }

  function openEdit(r: SalesRoute) {
    setForm({ ...r });
    setEditingId(r.id);
    setMode("form");
  }

  async function handleSave() {
    if (!form.name || !form.date || !form.sellerId || form.stops.length === 0)
      return;
    setIsSubmitting(true);

    try {
      const routePayload = {
        name: form.name,
        route_date: form.date,
        start_time: form.startTime,
        seller_id: form.sellerId,
        status: form.status,
        priority: form.priority,
        notes: form.notes,
      };

      let routeId = editingId;

      if (editingId) {
        // Atualiza a Rota
        await supabase.from("routes").update(routePayload).eq("id", editingId);
        // Deleta as paradas antigas para reinserir com a nova ordem
        await supabase.from("route_stops").delete().eq("route_id", editingId);
      } else {
        // Cria nova Rota
        const { data, error } = await supabase
          .from("routes")
          .insert(routePayload)
          .select()
          .single();
        if (error) throw error;
        routeId = data.id;
      }

      // Insere as Paradas (Stops) atualizadas
      const stopsPayload = form.stops.map((s, index) => ({
        route_id: routeId,
        client_id: s.clientId,
        stop_order: index + 1,
        observation: s.observation,
        status: s.status || "Pendente",
      }));

      await supabase.from("route_stops").insert(stopsPayload);

      await fetchData(); // Recarrega os dados reais do banco
      setMode("list");
    } catch (error) {
      console.error("Erro ao salvar rota:", error);
      alert("Houve um erro ao salvar a rota.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Tem certeza que deseja excluir esta rota?")) return;
    try {
      await supabase.from("routes").delete().eq("id", id); // Cascade deleta as paradas automaticamente
      setDbRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Erro ao excluir", error);
    }
  }

  function addStop(client: Client) {
    if (form.stops.find((s) => s.clientId === client.id)) return;
    const newStop: RouteStop = {
      id: Date.now(), // Temporário para a key do React
      clientId: client.id,
      clientName: client.name,
      city: client.city,
      phone: client.phone,
      order: form.stops.length + 1,
      observation: "",
      status: "Pendente",
    };
    setForm((f) => ({ ...f, stops: [...f.stops, newStop] }));
    setClientSearch("");
    setShowClientDrop(false);
  }

  function moveStop(i: number, dir: -1 | 1) {
    const stops = [...form.stops];
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    [stops[i], stops[j]] = [stops[j], stops[i]];
    setForm((f) => ({
      ...f,
      stops: stops.map((s, idx) => ({ ...s, order: idx + 1 })),
    }));
  }

  function removeStop(i: number) {
    setForm((f) => ({
      ...f,
      stops: f.stops
        .filter((_, idx) => idx !== i)
        .map((s, idx) => ({ ...s, order: idx + 1 })),
    }));
  }

  function updateStopObs(i: number, obs: string) {
    setForm((f) => ({
      ...f,
      stops: f.stops.map((s, idx) =>
        idx === i ? { ...s, observation: obs } : s,
      ),
    }));
  }

  function setSellerById(id: number) {
    const s = dbSellers.find((s) => s.id === id);
    if (s)
      setForm((f) => ({
        ...f,
        sellerId: s.id,
        sellerName: s.name,
        sellerAvatar: s.avatar,
      }));
  }

  const filteredClients = dbClients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(clientSearch.toLowerCase())),
  );

  const filteredRoutes = dbRoutes.filter(
    (r) => filterStatus === "Todas" || r.status === filterStatus,
  );
  const sellerColors = [
    "bg-amber-600",
    "bg-[#1e4023]",
    "bg-[#2d6a3a]",
    "bg-[#c8921c]",
  ];

  if (loading && mode === "list") {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (mode === "list")
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Route className="w-5 h-5 text-[#1e4023]" /> Rotas Inteligentes
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Planejamento de visitas da equipe de vendas
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nova Rota
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total de Rotas",
              value: dbRoutes.length,
              icon: Route,
              color: "bg-[#1e4023]",
            },
            {
              label: "Rotas Ativas",
              value: dbRoutes.filter((r) => r.status === "Ativa").length,
              icon: Navigation,
              color: "bg-amber-500",
            },
            {
              label: "Concluídas",
              value: dbRoutes.filter((r) => r.status === "Concluída").length,
              icon: CheckSquare,
              color: "bg-emerald-600",
            },
            {
              label: "Paradas Totais",
              value: dbRoutes.reduce((a, r) => a + r.stops.length, 0),
              icon: MapPin,
              color: "bg-[#c8921c]",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 shadow-sm"
            >
              <div
                className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center flex-shrink-0`}
              >
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">
            Filtrar:
          </span>
          {(["Todas", "Rascunho", "Ativa", "Concluída"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-secondary"}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRoutes.map((r) => {
            const visitedCount = r.stops.filter(
              (s) => s.status === "Visitado",
            ).length;
            const pct =
              r.stops.length > 0 ? (visitedCount / r.stops.length) * 100 : 0;
            const sellerIdx = dbSellers.findIndex((s) => s.id === r.sellerId);

            return (
              <motion.div
                key={r.id}
                layout
                className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {r.priority === "Urgente" ? (
                  <div className="h-1 bg-gradient-to-r from-red-500 to-red-400" />
                ) : (
                  <div className="h-1 bg-gradient-to-r from-[#1e4023] to-[#2d6a3a]" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground text-sm">
                          {r.name}
                        </h3>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[r.priority]}`}
                        >
                          {r.priority === "Urgente" && (
                            <Zap className="w-2.5 h-2.5 inline mr-0.5" />
                          )}
                          {r.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(r.date + "T00:00:00").toLocaleDateString(
                            "pt-BR",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {r.startTime}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLORS[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-secondary/40">
                    <div
                      className={`w-7 h-7 rounded-full ${sellerColors[sellerIdx % sellerColors.length] || "bg-gray-500"} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
                    >
                      {r.sellerAvatar}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {r.sellerName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Vendedor responsável
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {r.stops.slice(0, 3).map((stop, i) => (
                      <div
                        key={stop.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stop.status === "Visitado" ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                        />
                        <span className="truncate text-foreground/80">
                          {stop.clientName}
                        </span>
                      </div>
                    ))}
                    {r.stops.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-6">
                        +{r.stops.length - 3} parada(s)
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {visitedCount}/{r.stops.length} paradas visitadas
                      </span>
                      <span className="font-semibold text-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1e4023] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {r.notes && (
                    <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 mb-4 line-clamp-2 italic">
                      "{r.notes}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => openEdit(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar Rota
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredRoutes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Route className="w-10 h-10 opacity-20" />
            <p className="text-sm">Nenhuma rota encontrada</p>
            <button
              onClick={openNew}
              className="text-sm text-primary hover:underline font-medium"
            >
              Criar a primeira rota
            </button>
          </div>
        )}
      </div>
    );

  const isValid =
    form.name && form.date && form.sellerId && form.stops.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMode("list")}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {editingId ? "Editar Rota" : "Nova Rota Inteligente"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Defina os estabelecimentos, ordem de visita e instruções
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Info da Rota */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Informações da Rota
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Nome da Rota *
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ex: Rota Centro - Petrolina"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Data da Rota *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Horário de Saída
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Vendedor Responsável *
                </label>
                <div className="relative">
                  <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    value={form.sellerId}
                    onChange={(e) => setSellerById(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none"
                  >
                    <option value={0}>Selecionar vendedor...</option>
                    {dbSellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - {s.region}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Prioridade
                </label>
                <div className="flex gap-2">
                  {(["Normal", "Urgente"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${form.priority === p ? (p === "Urgente" ? "bg-red-50 border-red-300 text-red-700" : "bg-primary text-primary-foreground border-primary") : "bg-card border-border text-muted-foreground hover:bg-secondary"}`}
                    >
                      {p === "Urgente" && (
                        <Zap className="w-3.5 h-3.5 inline mr-1" />
                      )}
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Builder de Paradas */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Paradas da Rota
                </h3>
              </div>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {form.stops.length} parada(s)
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDrop(true);
                }}
                onFocus={() => setShowClientDrop(true)}
                placeholder="Buscar e adicionar estabelecimento..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />

              {showClientDrop && clientSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                  {filteredClients.slice(0, 6).map((c) => {
                    const already = !!form.stops.find(
                      (s) => s.clientId === c.id,
                    );
                    return (
                      <button
                        type="button"
                        key={c.id}
                        disabled={already}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors text-left ${already ? "opacity-40 cursor-not-allowed bg-muted/30" : "hover:bg-secondary/50"}`}
                        onClick={() => addStop(c)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {c.city}
                          </p>
                        </div>
                        {already ? (
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                            Já adicionado
                          </span>
                        ) : (
                          <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  {filteredClients.length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">
                      Nenhum cliente encontrado
                    </p>
                  )}
                </div>
              )}
            </div>

            {form.stops.length > 0 ? (
              <div className="space-y-2">
                <AnimatePresence>
                  {form.stops.map((stop, i) => (
                    <RouteStopRow
                      key={stop.id}
                      stop={stop}
                      index={i}
                      total={form.stops.length}
                      onMoveUp={() => moveStop(i, -1)}
                      onMoveDown={() => moveStop(i, 1)}
                      onRemove={() => removeStop(i)}
                      onObsChange={(v) => updateStopObs(i, v)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2 border-2 border-dashed border-border rounded-xl">
                <Navigation className="w-7 h-7 opacity-25" />
                <p className="text-sm">Nenhuma parada adicionada</p>
                <p className="text-xs opacity-60">
                  Use a busca acima para adicionar estabelecimentos
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Resumo Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm sticky top-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" /> Resumo da Rota
            </h3>

            <div className="space-y-2.5 text-sm">
              {[
                { label: "Rota", value: form.name || "--" },
                {
                  label: "Data",
                  value: form.date
                    ? new Date(form.date + "T00:00:00").toLocaleDateString(
                        "pt-BR",
                        { day: "2-digit", month: "long", year: "numeric" },
                      )
                    : "--",
                },
                { label: "Saída", value: form.startTime || "--" },
                { label: "Vendedor", value: form.sellerName || "--" },
                {
                  label: "Paradas",
                  value: `${form.stops.length} estabelecimento(s)`,
                },
                { label: "Prioridade", value: form.priority },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-2"
                >
                  <span className="text-muted-foreground text-xs">
                    {item.label}
                  </span>
                  <span className="text-xs font-medium text-foreground text-right max-w-[60%] truncate">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {form.stops.length > 0 && (
              <div className="border-t border-border pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Sequência
                </p>
                {form.stops.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full bg-[#1e4023] text-white text-[9px] font-bold flex items-center justify-center">
                        {i + 1}
                      </div>
                      {i < form.stops.length - 1 && (
                        <div className="w-px h-3 bg-border mt-0.5" />
                      )}
                    </div>
                    <span className="truncate text-foreground/80">
                      {s.clientName.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-3">
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
                <StickyNote className="w-3.5 h-3.5" /> Observações Gerais
              </label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Instruções gerais, produtos a destacar..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Status da Rota
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["Rascunho", "Ativa", "Concluída"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${form.status === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!isValid || isSubmitting}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-[#163318] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />{" "}
                  {editingId ? "Salvar Alterações" : "Criar Rota"}
                </>
              )}
            </button>
            {!isValid && (
              <p className="text-[10px] text-muted-foreground text-center -mt-2">
                Preencha nome, data, vendedor e ao menos 1 parada
              </p>
            )}

            <button
              onClick={() => setMode("list")}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar sem salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
