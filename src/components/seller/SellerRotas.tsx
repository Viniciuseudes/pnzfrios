"use client";
import { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  Navigation2,
  Phone,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "@/utils/supabase";
import { useApp } from "@/contexts/AppContext";

export function SellerRotas() {
  const { session } = useApp();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRoutes() {
    if (!session?.sellerId) return;
    setLoading(true);

    // Busca rotas Ativas ou Concluídas do vendedor, ordenando pela data mais recente
    const { data, error } = await supabase
      .from("routes")
      .select(
        `
        id, name, route_date, start_time, status, priority, notes,
        route_stops(
          id, stop_order, observation, status,
          clients(name, city, phone, street, number, neighborhood)
        )
      `,
      )
      .eq("seller_id", session.sellerId)
      .in("status", ["Ativa", "Concluída"])
      .order("route_date", { ascending: false });

    if (data && !error) {
      // Ordena as paradas pela ordem definida pelo Admin
      const formattedRoutes = data.map((r: any) => ({
        ...r,
        route_stops: r.route_stops.sort(
          (a: any, b: any) => a.stop_order - b.stop_order,
        ),
      }));
      setRoutes(formattedRoutes);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRoutes();
  }, [session]);

  // Função para marcar check-in no cliente
  async function handleCheckIn(stopId: number, currentStatus: string) {
    const newStatus = currentStatus === "Visitado" ? "Pendente" : "Visitado";

    // Atualiza otimisticamente na tela
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        route_stops: r.route_stops.map((s: any) =>
          s.id === stopId ? { ...s, status: newStatus } : s,
        ),
      })),
    );

    // Atualiza no banco de dados
    await supabase
      .from("route_stops")
      .update({ status: newStatus })
      .eq("id", stopId);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4023]"></div>
      </div>
    );
  }

  const activeRoute = routes.find((r) => r.status === "Ativa");
  const pastRoutes = routes.filter((r) => r.status === "Concluída");

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Minhas Rotas</h2>
        <p className="text-xs text-muted-foreground">
          Seu roteiro de visitas planejado
        </p>
      </div>

      {!activeRoute ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 bg-card border border-border rounded-2xl">
          <Navigation className="w-10 h-10 opacity-20" />
          <p className="text-sm">Nenhuma rota ativa para hoje</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
          <div
            className={`p-5 text-white relative overflow-hidden ${activeRoute.priority === "Urgente" ? "bg-red-600" : "bg-[#1e4023]"}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-10 translate-x-10" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 uppercase tracking-widest backdrop-blur-sm">
                  Rota do Dia
                </span>
                {activeRoute.priority === "Urgente" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-red-600 uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Urgente
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold leading-tight mt-2">
                {activeRoute.name}
              </h3>
              <div className="flex items-center gap-4 text-xs mt-3 opacity-90">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {activeRoute.start_time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {activeRoute.route_stops.length} paradas
                </span>
              </div>
            </div>
          </div>

          {activeRoute.notes && (
            <div className="bg-amber-50 border-b border-amber-100 p-3 text-xs text-amber-800 flex gap-2 items-start">
              <div className="w-4 h-4 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                !
              </div>
              <p className="italic">"{activeRoute.notes}"</p>
            </div>
          )}

          <div className="p-2">
            {activeRoute.route_stops.map((stop: any, i: number) => {
              const isVisited = stop.status === "Visitado";
              return (
                <div key={stop.id} className="relative flex gap-4 p-3 group">
                  {i < activeRoute.route_stops.length - 1 && (
                    <div
                      className={`absolute left-[27px] top-[40px] bottom-[-10px] w-0.5 ${isVisited ? "bg-emerald-500" : "bg-border"} z-0`}
                    />
                  )}

                  <button
                    onClick={() => handleCheckIn(stop.id, stop.status)}
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                      isVisited
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    {isVisited ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </button>

                  <div
                    className={`flex-1 bg-secondary/30 rounded-2xl p-4 transition-all ${isVisited ? "opacity-60" : ""}`}
                  >
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {stop.clients.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {stop.clients.street}, {stop.clients.number} -{" "}
                      {stop.clients.neighborhood}
                    </p>

                    {stop.clients.phone && (
                      <a
                        href={`https://wa.me/55${stop.clients.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e4023] bg-[#1e4023]/10 px-2.5 py-1.5 rounded-lg mt-3 hover:bg-[#1e4023]/20 transition-colors"
                      >
                        <Phone className="w-3 h-3" /> Chamar
                      </a>
                    )}

                    {stop.observation && (
                      <div className="mt-3 bg-card rounded-lg p-2.5 border border-border text-[11px] text-muted-foreground italic">
                        "{stop.observation}"
                      </div>
                    )}

                    {!isVisited && (
                      <div className="mt-4 flex gap-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stop.clients.street}, ${stop.clients.number}, ${stop.clients.city}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1e4023] text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                        >
                          <Navigation2 className="w-3.5 h-3.5" /> Navegar
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pastRoutes.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-bold text-foreground">
            Rotas Concluídas
          </h3>
          {pastRoutes.slice(0, 3).map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-xl p-3 flex items-center justify-between opacity-70"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {r.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(r.route_date + "T00:00:00").toLocaleDateString(
                    "pt-BR",
                  )}{" "}
                  • {r.route_stops.length} paradas
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
