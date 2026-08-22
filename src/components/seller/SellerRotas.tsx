"use client";
import { useState, useEffect } from "react";
import {
  Navigation,
  MapPin,
  Clock,
  Phone,
  Navigation2,
  Filter,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useApp } from "@/contexts/AppContext";
import type { SalesRoute } from "@/types";

export function SellerRotas() {
  const { session } = useApp();
  const [routes, setRoutes] = useState<SalesRoute[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de Data
  const [dateFilter, setDateFilter] = useState("current_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const formatDbDate = (d: Date) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${da}`;
  };

  async function fetchMyRoutes() {
    if (!session?.sellerId) return;
    setLoading(true);

    let start = new Date();
    let end = new Date();

    if (dateFilter === "current_month") {
      start = new Date(start.getFullYear(), start.getMonth(), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    } else if (dateFilter === "last_month") {
      start = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      end = new Date(start.getFullYear(), start.getMonth(), 0);
    } else if (dateFilter === "custom" && startDate && endDate) {
      start = new Date(startDate + "T00:00:00");
      end = new Date(endDate + "T23:59:59");
    } else {
      start = new Date(start.getFullYear(), start.getMonth(), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }

    const { data, error } = await supabase
      .from("routes")
      .select(
        `*, route_stops (id, stop_order, observation, status, client_id, clients (name, city, phone, street, number, neighborhood))`,
      )
      .eq("seller_id", session.sellerId)
      .gte("route_date", formatDbDate(start))
      .lte("route_date", formatDbDate(end))
      .order("route_date", { ascending: false });

    if (data && !error) {
      const formatted: SalesRoute[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        date: r.route_date,
        startTime: r.start_time,
        sellerId: r.seller_id,
        sellerName: "",
        sellerAvatar: "",
        status: r.status,
        priority: r.priority,
        notes: r.notes || "",
        stops: (r.route_stops || [])
          .sort((a: any, b: any) => a.stop_order - b.stop_order)
          .map((s: any) => ({
            id: s.id,
            clientId: s.client_id,
            clientName: s.clients?.name || "Cliente",
            city: s.clients?.city || "",
            phone: s.clients?.phone || "",
            order: s.stop_order,
            observation: s.observation || "",
            status: s.status,
            fullAddress: `${s.clients?.street || ""}, ${s.clients?.number || ""} - ${s.clients?.neighborhood || ""}`,
          })),
      }));
      setRoutes(formatted);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMyRoutes();
    if (!session?.sellerId) return;
    const channel = supabase
      .channel("seller_routes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "routes",
          filter: `seller_id=eq.${session.sellerId}`,
        },
        () => {
          fetchMyRoutes();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, dateFilter, startDate, endDate]);

  async function handleCheckin(stopId: number) {
    await supabase
      .from("route_stops")
      .update({ status: "Visitado" })
      .eq("id", stopId);
  }

  return (
    <div className="space-y-4 pb-24">
      {/* BARRA DE FILTRO */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Filter className="w-4 h-4" /> Filtro:
        </div>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="current_month">Mês Atual</option>
          <option value="last_month">Mês Anterior</option>
          <option value="custom">Período Personalizado</option>
        </select>
        {dateFilter === "custom" && (
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-2 rounded-lg bg-input-background border border-border text-xs"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-2 rounded-lg bg-input-background border border-border text-xs"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 bg-card border border-border rounded-2xl shadow-sm">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
            <Navigation className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Rota Livre</h2>
          <p className="text-sm text-muted-foreground">
            Nenhuma rota encontrada neste período.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {routes.map((activeRoute, routeIdx) => {
            const progress =
              activeRoute.stops.length > 0
                ? (activeRoute.stops.filter((s) => s.status === "Visitado")
                    .length /
                    activeRoute.stops.length) *
                  100
                : 0;
            return (
              <div key={activeRoute.id} className="space-y-4">
                <div className="bg-card border border-border shadow-sm rounded-2xl p-5 overflow-hidden relative">
                  <div
                    className={`absolute top-0 left-0 w-1.5 h-full ${activeRoute.status === "Concluída" ? "bg-emerald-500" : "bg-primary"}`}
                  />
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    {activeRoute.date.split("-").reverse().join("/")}
                  </p>
                  <h1 className="text-xl font-black text-foreground mb-4">
                    {activeRoute.name}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        {activeRoute.startTime}
                      </span>{" "}
                      Saída
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        {activeRoute.stops.length}
                      </span>{" "}
                      Paradas
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${progress === 100 ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {activeRoute.notes && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 italic">
                      <strong className="block mb-1">Aviso da Base:</strong>
                      {activeRoute.notes}
                    </div>
                  )}
                </div>

                <div className="space-y-4 px-2">
                  <div className="relative pl-4">
                    <div className="absolute top-0 bottom-0 left-5 w-0.5 bg-border rounded-full" />
                    <div className="space-y-6">
                      {activeRoute.stops.map((stop, index) => {
                        const isDone = stop.status === "Visitado";
                        return (
                          <div key={stop.id} className="relative flex gap-4">
                            <div
                              className={`relative z-10 w-3 h-3 mt-1.5 rounded-full ring-4 ring-background ${isDone ? "bg-emerald-500" : "bg-muted-foreground"}`}
                            />
                            <div
                              className={`flex-1 bg-card border rounded-2xl p-4 shadow-sm transition-opacity ${isDone ? "opacity-60 border-emerald-100" : "border-border"}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="pr-2">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">
                                    Parada {index + 1}
                                  </span>
                                  <h4
                                    className={`text-base font-bold leading-tight ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}
                                  >
                                    {stop.clientName}
                                  </h4>
                                </div>
                              </div>
                              <div className="space-y-2 mt-3 text-xs text-muted-foreground">
                                <p className="flex items-start gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">
                                    {stop.fullAddress}
                                  </span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                  {stop.phone || "Telefone indisponível"}
                                </p>
                                {stop.observation && (
                                  <p className="p-2 bg-secondary/50 rounded-lg italic border border-border/50">
                                    "{stop.observation}"
                                  </p>
                                )}
                              </div>
                              {!isDone &&
                                activeRoute.status !== "Concluída" && (
                                  <div className="mt-4 flex gap-2">
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.fullAddress + " " + stop.city)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex-1 py-2.5 bg-secondary text-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                                    >
                                      <Navigation2 className="w-3.5 h-3.5" />{" "}
                                      Navegar
                                    </a>
                                    <button
                                      onClick={() => handleCheckin(stop.id)}
                                      className="flex-[2] py-2.5 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 transition-transform"
                                    >
                                      Fazer Check-in
                                    </button>
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
