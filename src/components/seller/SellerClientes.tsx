"use client";
import { useState, useEffect } from "react";
import {
  Search,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ReceiptText,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { supabase } from "@/utils/supabase";
import { useApp } from "@/contexts/AppContext";
import { fmt } from "@/utils/format";

type ClientRFM = {
  id: number;
  name: string;
  phone: string;
  city: string;
  fullAddress: string;
  doc: string;
  lastOrderDate: string;
  daysSinceLastOrder: number;
  status: "active" | "warning" | "danger";
  totalSpent: number;
  orderCount: number;
  recentOrders: any[]; // Guardaremos o histórico para o Raio-X
};

export function SellerClientes() {
  const { session } = useApp();
  const [clients, setClients] = useState<ClientRFM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [recencyFilter, setRecencyFilter] = useState<
    "all" | "warning" | "danger"
  >("all");
  const [expandedClient, setExpandedClient] = useState<number | null>(null);

  useEffect(() => {
    async function fetchMyClients() {
      if (!session?.sellerId) return;
      setLoading(true);

      // Buscamos o endereço completo e os itens do pedido para inteligência de vendas
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id, order_number, created_at, status,
          order_items(qty, price, products(name)),
          clients (id, name, phone, city, street, number, neighborhood, doc)
        `,
        )
        .eq("seller_id", session.sellerId)
        .neq("status", "cancelado")
        .order("created_at", { ascending: false });

      if (error || !data) {
        console.error("Erro ao buscar carteira:", error);
        setLoading(false);
        return;
      }

      const clientMap = new Map<number, ClientRFM>();
      const now = new Date().getTime();

      data.forEach((order: any) => {
        const c = Array.isArray(order.clients)
          ? order.clients[0]
          : order.clients;
        if (!c) return;

        const orderTotal = order.order_items.reduce(
          (acc: number, item: any) => acc + item.qty * item.price,
          0,
        );
        const orderTime = new Date(order.created_at).getTime();

        // Monta o endereço exato ignorando campos vazios
        const addressParts = [
          c.street,
          c.number,
          c.neighborhood,
          c.city,
        ].filter(Boolean);
        const fullAddress =
          addressParts.length > 0
            ? addressParts.join(", ")
            : "Endereço não cadastrado";

        // Formata os produtos do pedido para exibir no Raio-X
        const formattedOrder = {
          id: order.id,
          order_number: order.order_number,
          date: order.created_at,
          total: orderTotal,
          items: order.order_items.map((i: any) => ({
            name: i.products?.name || "Produto",
            qty: i.qty,
            price: i.price,
          })),
        };

        if (!clientMap.has(c.id)) {
          clientMap.set(c.id, {
            id: c.id,
            name: c.name,
            phone: c.phone || "",
            city: c.city || "",
            fullAddress: fullAddress,
            doc: c.doc || "",
            lastOrderDate: order.created_at,
            daysSinceLastOrder: Math.floor(
              (now - orderTime) / (1000 * 60 * 60 * 24),
            ),
            status: "active",
            totalSpent: orderTotal,
            orderCount: 1,
            recentOrders: [formattedOrder],
          });
        } else {
          const existing = clientMap.get(c.id)!;
          existing.totalSpent += orderTotal;
          existing.orderCount += 1;
          existing.recentOrders.push(formattedOrder);

          const existingTime = new Date(existing.lastOrderDate).getTime();
          if (orderTime > existingTime) {
            existing.lastOrderDate = order.created_at;
            existing.daysSinceLastOrder = Math.floor(
              (now - orderTime) / (1000 * 60 * 60 * 24),
            );
          }
        }
      });

      const finalClients = Array.from(clientMap.values()).map((c) => {
        if (c.daysSinceLastOrder >= 30) c.status = "danger";
        else if (c.daysSinceLastOrder >= 15) c.status = "warning";
        return c;
      });

      // Ordena pelos clientes com maior risco primeiro
      finalClients.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

      setClients(finalClients);
      setLoading(false);
    }

    fetchMyClients();
  }, [session]);

  const filteredClients = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    const matchRecency = recencyFilter === "all" || c.status === recencyFilter;
    return matchSearch && matchRecency;
  });

  const warningCount = clients.filter((c) => c.status === "warning").length;
  const dangerCount = clients.filter((c) => c.status === "danger").length;

  const handleWhatsApp = (
    e: React.MouseEvent,
    phone: string,
    name: string,
    days: number,
  ) => {
    e.stopPropagation();
    if (!phone) return alert("Cliente sem telefone cadastrado.");
    const cleanPhone = phone.replace(/\D/g, "");
    let text = `Olá ${name.split(" ")[0]}, tudo bem?`;
    if (days >= 15)
      text += ` Notei que faz um tempinho desde o seu último pedido, tem algo que eu possa ajudar hoje?`;
    window.open(
      `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  const handleMaps = (e: React.MouseEvent, fullAddress: string) => {
    e.stopPropagation();
    if (!fullAddress || fullAddress === "Endereço não cadastrado") {
      return alert("Endereço exato não cadastrado para este cliente.");
    }
    window.open(
      `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`,
      "_blank",
    );
  };

  // Motor de Inteligência de Vendas (Sugestões de Abordagem)
  const getSalesInsight = (status: string) => {
    if (status === "danger")
      return "Risco de perda. Ofereça uma condição especial ou brinde para reativar o cliente urgente.";
    if (status === "warning")
      return "Cliente esfriando. Pergunte como foi a saída dos últimos produtos e ofereça reposição.";
    return "Cliente aquecido. Excelente momento para fazer cross-sell e apresentar novidades do catálogo.";
  };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-bold text-foreground">Minha Carteira</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {clients.length} clientes ativos na sua base
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() =>
            setRecencyFilter(recencyFilter === "warning" ? "all" : "warning")
          }
          className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
            recencyFilter === "warning"
              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-card border-border shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
              Atenção
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground">{warningCount}</p>
          <p className="text-[9px] text-muted-foreground font-medium mt-1">
            15 a 29 dias inativo
          </p>
        </button>

        <button
          onClick={() =>
            setRecencyFilter(recencyFilter === "danger" ? "all" : "danger")
          }
          className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
            recencyFilter === "danger"
              ? "bg-red-500/10 border-red-500 ring-2 ring-red-500/20"
              : "bg-card border-border shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
              Risco
            </span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-foreground">{dangerCount}</p>
          <p className="text-[9px] text-muted-foreground font-medium mt-1">
            30+ dias inativo
          </p>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente ou cidade..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-card border border-border border-dashed rounded-2xl">
          <p className="text-sm font-medium">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((c) => {
            const isExpanded = expandedClient === c.id;
            const lastOrder = c.recentOrders[0]; // O último pedido é o índice 0

            return (
              <div
                key={c.id}
                onClick={() => setExpandedClient(isExpanded ? null : c.id)}
                className={`bg-card rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                  isExpanded
                    ? "border-primary/40 shadow-md"
                    : "border-border shadow-sm hover:border-primary/20"
                }`}
              >
                {/* HEADER DO CARD */}
                <div className="p-4 flex items-start gap-3">
                  <Avatar
                    initials={c.name.slice(0, 2).toUpperCase()}
                    color="bg-[#1e4023]"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {c.name}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 opacity-70 flex-shrink-0" />
                      <span className="truncate">{c.fullAddress}</span>
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                      Ticket
                    </p>
                    <p className="text-xs font-black text-[#1e4023] mb-1">
                      {fmt(c.totalSpent / c.orderCount)}
                    </p>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* ÁREA EXPANDIDA: INTELIGÊNCIA COMERCIAL */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Insight de Abordagem */}
                    <div
                      className={`mb-3 p-3 rounded-xl border flex items-start gap-2 ${
                        c.status === "danger"
                          ? "bg-red-50 border-red-100 text-red-800"
                          : c.status === "warning"
                            ? "bg-amber-50 border-amber-100 text-amber-800"
                            : "bg-emerald-50 border-emerald-100 text-emerald-800"
                      }`}
                    >
                      <Lightbulb
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          c.status === "danger"
                            ? "text-red-600"
                            : c.status === "warning"
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }`}
                      />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-80">
                          Insight de Venda
                        </p>
                        <p className="text-xs font-medium leading-relaxed">
                          {getSalesInsight(c.status)}
                        </p>
                      </div>
                    </div>

                    {/* Detalhes do Último Pedido */}
                    {lastOrder && (
                      <div className="bg-secondary/40 border border-border/50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/50">
                          <p className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                            <ReceiptText className="w-3.5 h-3.5 text-primary" />{" "}
                            Último Pedido
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {lastOrder.order_number}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          {lastOrder.items
                            .slice(0, 3)
                            .map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-xs"
                              >
                                <span className="text-muted-foreground truncate pr-2">
                                  {item.qty}x {item.name}
                                </span>
                                <span className="font-semibold text-foreground">
                                  {fmt(item.qty * item.price)}
                                </span>
                              </div>
                            ))}
                          {lastOrder.items.length > 3 && (
                            <p className="text-[10px] text-muted-foreground italic pt-1">
                              + {lastOrder.items.length - 3} outros itens
                            </p>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(lastOrder.date).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                          <span className="text-xs font-black text-primary">
                            Total: {fmt(lastOrder.total)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* INDICADOR DE RECÊNCIA */}
                <div className="px-4 py-2 bg-secondary/50 border-t border-border/50">
                  {c.status === "danger" ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                      <AlertTriangle className="w-3.5 h-3.5" />{" "}
                      {c.daysSinceLastOrder} dias sem comprar
                    </span>
                  ) : c.status === "warning" ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <Clock className="w-3.5 h-3.5" /> {c.daysSinceLastOrder}{" "}
                      dias sem comprar
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Comprando
                      ativamente ({c.daysSinceLastOrder}d)
                    </span>
                  )}
                </div>

                {/* QUICK ACTIONS */}
                <div className="flex bg-card border-t border-border/50">
                  <button
                    onClick={(e) =>
                      handleWhatsApp(e, c.phone, c.name, c.daysSinceLastOrder)
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors border-r border-border/50"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    onClick={(e) => handleMaps(e, c.fullAddress)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <MapIcon className="w-4 h-4" /> Rota GPS
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
