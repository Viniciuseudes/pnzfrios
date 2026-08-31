"use client";
import { useState, useEffect } from "react";
import {
  Search,
  X,
  CheckCircle,
  PackageOpen,
  Minus,
  Plus,
  ShoppingCart,
  BookOpen,
  ChevronLeft,
  QrCode,
  Barcode,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ClientModal } from "@/components/ui/ClientModal";
import { fmt } from "@/utils/format";
import type { Client, Product, OrderItem } from "@/types";
import { supabase } from "@/utils/supabase";
import { useApp } from "@/contexts/AppContext";

export function SellerNovaVenda() {
  const { session } = useApp();

  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  // Estados de Pagamento e Configurações (Vencimento e Parcelas)
  const [billingType, setBillingType] = useState<
    "PIX" | "BOLETO" | "CREDIT_CARD"
  >("PIX");
  const [dueDate, setDueDate] = useState<string>(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split("T")[0];
  });
  const [installments, setInstallments] = useState<number>(1);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Controle do Catálogo Fullscreen
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoadingData(true);
    const [{ data: clientsData }, { data: productsData }] = await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .eq("status", "Ativo")
        .order("id", { ascending: false }),
      supabase.from("products").select("*").gt("stock", 0),
    ]);

    if (clientsData) setDbClients(clientsData as Client[]);
    if (productsData) setDbProducts(productsData as Product[]);
    setLoadingData(false);
  }

  // Função exclusiva para recarregar apenas os clientes após criar um novo
  async function refreshClients() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("status", "Ativo")
      .order("id", { ascending: false });
    if (data) setDbClients(data as Client[]);
  }

  const filteredClients = dbClients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.doc && c.doc.includes(clientSearch)),
  );

  const filteredProducts = dbProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );
  const catalogProducts = dbProducts.filter((p) =>
    p.name.toLowerCase().includes(catalogSearch.toLowerCase()),
  );

  const total = orderItems.reduce((a, i) => a + i.qty * i.price, 0);

  function addProduct(p: Product) {
    setOrderItems((prev) => {
      const ex = prev.find((i) => i.productId === p.id);
      if (ex)
        return prev.map((i) =>
          i.productId === p.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [
        ...prev,
        { productId: p.id, name: p.name, qty: 1, price: p.price },
      ];
    });
    setProductSearch("");
  }

  function updateQty(id: number, delta: number) {
    setOrderItems((prev) => {
      return prev
        .map((i) => {
          if (i.productId === id) {
            const newQty = i.qty + delta;
            if (newQty <= 0) return null as any;
            return { ...i, qty: newQty };
          }
          return i;
        })
        .filter(Boolean);
    });
  }

  function getQtyInCart(productId: number) {
    const item = orderItems.find((i) => i.productId === productId);
    return item ? item.qty : 0;
  }

  async function handleConfirmOrder() {
    if (!selectedClient || !session?.sellerId || orderItems.length === 0)
      return;

    setIsSubmitting(true);

    try {
      const { data: lastOrder } = await supabase
        .from("orders")
        .select("order_number")
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (lastOrder && lastOrder.length > 0 && lastOrder[0].order_number) {
        nextNum =
          parseInt(lastOrder[0].order_number.replace(/\D/g, ""), 10) + 1;
      }
      const orderNumber = `#${nextNum.toString().padStart(4, "0")}`;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          client_id: selectedClient.id,
          seller_id: session.sellerId,
          priority: "Normal",
          status: "novo",
          payment_status: "PENDING",
          payment_method: billingType,
          delivery_address: selectedClient.city,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        qty: item.qty,
        price: item.price,
      }));

      await supabase.from("order_items").insert(itemsToInsert);

      await supabase.from("order_history").insert({
        order_id: order.id,
        status: "novo",
        changed_by: "App Vendedor",
        note: `Pedido criado em campo. Método: ${billingType} (${installments}x)`,
      });

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          clientId: selectedClient.id,
          billingType: billingType,
          totalValue: total,
          dueDate: dueDate,
          installments: installments,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok)
        throw new Error(
          checkoutData.error || "Erro ao gerar cobrança no Asaas",
        );

      // --- INÍCIO DOS GATILHOS DE NOTIFICAÇÃO PUSH ---
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000");

        // 1. Notificação Padrão de Nova Venda
        await fetch(`${baseUrl}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: "admin",
            title: "Novo Pedido Registrado",
            body: `Pedido ${orderNumber} registrado para ${selectedClient.name}. Valor total: ${fmt(total)}.`,
            url: "/admin/pedidos",
          }),
        });

        // 2. Inteligência de Estoque Crítico
        // Verifica se a quantidade vendida deixou algum produto no limite
        const produtosCriticos = orderItems.filter((item) => {
          const produtoNoBanco = dbProducts.find(
            (p) => p.id === item.productId,
          );
          return produtoNoBanco && produtoNoBanco.stock - item.qty <= 15;
        });

        if (produtosCriticos.length > 0) {
          const nomesCriticos = produtosCriticos.map((p) => p.name).join(", ");
          await fetch(`${baseUrl}/api/push/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetUserId: "admin", // Alerta a central de compras/gestão
              title: "Alerta de Estoque Critico",
              body: `A ultima venda reduziu o estoque a niveis de risco: ${nomesCriticos}. Verifique a necessidade de reposicao.`,
              url: "/admin/produtos",
            }),
          });
        }
      } catch (pushErr) {
        console.error("Falha ao enviar notificacao push:", pushErr);
      }
      // --- FIM DOS GATILHOS ---

      setPaymentResult(checkoutData);
      setConfirmed(true);
    } catch (error: any) {
      console.error("Erro ao fechar pedido:", error);
      alert(`Falha na Venda: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Código PIX copiado com sucesso!");
  };

  if (confirmed)
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-4 px-4 pb-24">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Pedido Gerado!</h2>

        {billingType === "PIX" && paymentResult?.pix ? (
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center mt-2">
            <p className="text-sm font-semibold text-foreground mb-4">
              Escaneie para pagar
            </p>
            <img
              src={`data:image/jpeg;base64,${paymentResult.pix.encodedImage}`}
              alt="QR Code PIX"
              className="w-48 h-48 border border-border rounded-xl p-2 mb-4"
            />
            <p className="text-xs text-muted-foreground mb-2">
              Ou use o PIX Copia e Cola:
            </p>
            <div className="flex items-center w-full gap-2 bg-input-background border border-border p-2 rounded-xl">
              <input
                readOnly
                value={paymentResult.pix.payload}
                className="text-xs bg-transparent w-full outline-none text-muted-foreground truncate"
              />
              <button
                onClick={() => copyToClipboard(paymentResult.pix.payload)}
                className="p-2 bg-primary text-primary-foreground rounded-lg shadow-sm active:scale-95 transition-transform"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : paymentResult?.invoiceUrl ? (
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center mt-2">
            <p className="text-sm text-muted-foreground mb-4">
              A cobrança foi gerada com sucesso. Envie o link para o cliente.
            </p>
            <a
              href={paymentResult.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 rounded-xl bg-[#1e4023] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#163318] transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Acessar Fatura
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            O pedido foi enviado para análise na base.
          </p>
        )}

        <button
          onClick={() => {
            setConfirmed(false);
            setSelectedClient(null);
            setOrderItems([]);
            setPaymentResult(null);
            setInstallments(1);
          }}
          className="mt-6 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-bold hover:bg-secondary active:scale-95 transition-transform"
        >
          Novo Pedido
        </button>
      </div>
    );

  if (loadingData)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );

  return (
    <>
      {/* MODAL DE CADASTRO DE CLIENTE REAPROVEITADO */}
      {isClientModalOpen && (
        <ClientModal
          onClose={() => setIsClientModalOpen(false)}
          onSuccess={() => {
            refreshClients();
            setIsClientModalOpen(false);
            setClientSearch("");
            alert("Cliente cadastrado com sucesso! Você já pode selecioná-lo.");
          }}
        />
      )}

      {showCatalog && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 p-4 pt-safe border-b border-border bg-card shadow-sm">
            <button
              onClick={() => setShowCatalog(false)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-foreground" />
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground leading-none">
                Catálogo
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {dbProducts.length} itens disponíveis
              </p>
            </div>
            <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5" />
              {orderItems.reduce((a, i) => a + i.qty, 0)}
            </div>
          </div>

          <div className="p-4 border-b border-border bg-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Buscar produtos..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-secondary/20 pb-24 custom-scrollbar">
            <div className="grid grid-cols-2 gap-3">
              {catalogProducts.map((p) => {
                const qtyInCart = getQtyInCart(p.id);
                return (
                  <div
                    key={p.id}
                    className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="aspect-square bg-white border-b border-border/50 flex items-center justify-center p-2 relative">
                      {p.img ? (
                        <img
                          src={p.img}
                          alt={p.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <PackageOpen className="w-10 h-10 text-muted-foreground/20" />
                      )}
                      <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        {p.stock} {p.unit}
                      </span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight mb-1">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        {p.category}
                      </p>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-sm font-black text-primary">
                          {fmt(p.price)}
                        </span>
                      </div>
                      <div className="mt-3">
                        {qtyInCart > 0 ? (
                          <div className="flex items-center justify-between bg-primary/10 rounded-lg p-1">
                            <button
                              onClick={() => updateQty(p.id, -1)}
                              className="p-1.5 bg-card rounded shadow-sm text-primary active:scale-95"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-primary w-6 text-center">
                              {qtyInCart}
                            </span>
                            <button
                              onClick={() => updateQty(p.id, 1)}
                              className="p-1.5 bg-card rounded shadow-sm text-primary active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addProduct(p)}
                            className="w-full py-2 rounded-lg bg-card border border-border text-foreground text-xs font-bold hover:bg-secondary active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TELA PRINCIPAL DE VENDAS */}
      <div className="space-y-6 pb-48">
        <div>
          <h1 className="text-xl font-bold text-foreground">Força de Vendas</h1>
          <p className="text-sm text-muted-foreground">Tirar novo pedido</p>
        </div>

        {/* 1. Cliente */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            1. Cliente
          </label>
          {selectedClient ? (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-primary/30 shadow-sm">
              <Avatar
                initials={selectedClient.name.slice(0, 2).toUpperCase()}
                color="bg-[#1e4023]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {selectedClient.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {selectedClient.doc} • {selectedClient.city}
                </p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-2 rounded-full hover:bg-secondary"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 relative">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDrop(true);
                  }}
                  placeholder="Buscar cliente..."
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
                />
              </div>

              <button
                onClick={() => setIsClientModalOpen(true)}
                className="bg-primary text-white p-3.5 rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-sm"
                title="Cadastrar Novo Cliente"
              >
                <UserPlus className="w-5 h-5" />
              </button>

              {showClientDrop && clientSearch && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 text-left active:bg-secondary"
                        onClick={() => {
                          setSelectedClient(c);
                          setClientSearch("");
                          setShowClientDrop(false);
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.city}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Cliente não encontrado.
                      </p>
                      <button
                        onClick={() => {
                          setShowClientDrop(false);
                          setIsClientModalOpen(true);
                        }}
                        className="text-primary font-bold text-xs bg-primary/10 px-4 py-2 rounded-lg"
                      >
                        + Cadastrar Novo Cliente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Carrinho */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Carrinho
            </label>
            <button
              onClick={() => setShowCatalog(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
            >
              <BookOpen className="w-3.5 h-3.5" /> Abrir Catálogo
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Adição rápida por nome..."
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
            />
            {productSearch && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    className="w-full flex items-center justify-between px-4 py-3 border-b border-border/50 text-left active:bg-secondary"
                    onClick={() => addProduct(p)}
                  >
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.stock} {p.unit} em estoque
                      </p>
                    </div>
                    <span className="text-sm font-black text-primary">
                      {fmt(p.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {orderItems.length === 0 ? (
              <div
                onClick={() => setShowCatalog(true)}
                className="py-8 text-center bg-card rounded-2xl border border-dashed border-border flex flex-col items-center justify-center cursor-pointer"
              >
                <PackageOpen className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground mb-2">
                  Carrinho vazio
                </p>
                <span className="text-xs font-semibold text-primary underline">
                  Toque aqui para ver os produtos
                </span>
              </div>
            ) : (
              orderItems.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between p-3.5 bg-card rounded-2xl border border-border shadow-sm"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-bold text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-xs font-semibold text-primary">
                      {fmt(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-1">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="p-2 bg-white rounded shadow-sm text-foreground active:scale-95"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="p-2 bg-white rounded shadow-sm text-foreground active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Método de Pagamento e Configurações */}
        {orderItems.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              3. Forma de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setBillingType("PIX")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${billingType === "PIX" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-secondary"}`}
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs font-semibold">PIX</span>
              </button>
              <button
                onClick={() => setBillingType("BOLETO")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${billingType === "BOLETO" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-secondary"}`}
              >
                <Barcode className="w-5 h-5" />
                <span className="text-xs font-semibold">Boleto</span>
              </button>
              <button
                onClick={() => setBillingType("CREDIT_CARD")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${billingType === "CREDIT_CARD" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-secondary"}`}
              >
                <LinkIcon className="w-5 h-5" />
                <span className="text-xs font-semibold text-center leading-tight">
                  Link Cartão
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 bg-secondary/30 p-4 rounded-xl border border-border">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Vencimento Inicial
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {(billingType === "CREDIT_CARD" || billingType === "BOLETO") && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    {billingType === "BOLETO"
                      ? "Parcelas do Carnê"
                      : "Parcelamento"}
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <option key={num} value={num}>
                        {num}x de {fmt(total / num)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Fixo */}
        <div className="fixed bottom-[70px] left-0 right-0 p-4 bg-card border-t border-border shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-30 pb-safe">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted-foreground">
              Total da Venda
            </span>
            <span className="text-xl font-black text-foreground">
              {fmt(total)}
            </span>
          </div>
          <button
            disabled={
              !selectedClient || orderItems.length === 0 || isSubmitting
            }
            onClick={handleConfirmOrder}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" /> Gerar Cobrança e Pedido
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
