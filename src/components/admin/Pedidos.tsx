"use client";
import { useState, useEffect } from "react";
import {
  Search,
  X,
  Trash2,
  CheckCircle,
  Package,
  User2,
  QrCode,
  Barcode,
  Link as LinkIcon,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { fmt } from "@/utils/format";
import type { Client, Product, OrderItem, Seller } from "@/types";
import { supabase } from "@/utils/supabase";

export function Pedidos() {
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbSellers, setDbSellers] = useState<Seller[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<number | "">("");

  const [clientSearch, setClientSearch] = useState("");
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [discount, setDiscount] = useState("0");
  const [confirmed, setConfirmed] = useState(false);

  // Estados de Pagamento (Integração Asaas)
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

  useEffect(() => {
    async function fetchData() {
      const [
        { data: clientsData },
        { data: productsData },
        { data: sellersData },
      ] = await Promise.all([
        supabase.from("clients").select("*").eq("status", "Ativo"),
        supabase.from("products").select("*").gt("stock", 0),
        supabase.from("sellers").select("*"),
      ]);

      if (clientsData) setDbClients(clientsData as Client[]);
      if (productsData) setDbProducts(productsData as Product[]);
      if (sellersData) setDbSellers(sellersData as Seller[]);

      setLoadingData(false);
    }
    fetchData();
  }, []);

  const filteredClients = dbClients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()),
  );
  const filteredProducts = dbProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  const subtotal = orderItems.reduce(
    (a, i) => a + (Number(i.qty) || 0) * i.price,
    0,
  );
  const discountVal = (subtotal * parseFloat(discount || "0")) / 100;
  const total = subtotal - discountVal;

  function addProduct(p: Product) {
    setOrderItems((prev) => {
      const ex = prev.find((i) => i.productId === p.id);
      if (ex)
        return prev.map((i) =>
          i.productId === p.id ? { ...i, qty: (Number(i.qty) || 0) + 1 } : i,
        );
      return [
        ...prev,
        { productId: p.id, name: p.name, qty: 1, price: p.price },
      ];
    });
    setProductSearch("");
  }

  function updateQty(id: number, val: string | number) {
    setOrderItems((prev) =>
      prev.map((i) =>
        i.productId === id
          ? { ...i, qty: (val === "" ? "" : Number(val)) as number }
          : i,
      ),
    );
  }

  function removeItem(id: number) {
    setOrderItems((prev) => prev.filter((i) => i.productId !== id));
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Código PIX copiado com sucesso!");
  };

  async function handleConfirmOrder() {
    if (!selectedClient || !selectedSellerId || orderItems.length === 0) return;

    setIsSubmitting(true);

    try {
      const { data: lastOrder } = await supabase
        .from("orders")
        .select("order_number")
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (lastOrder && lastOrder.length > 0 && lastOrder[0].order_number) {
        const numStr = lastOrder[0].order_number.replace(/\D/g, "");
        nextNum = parseInt(numStr, 10) + 1;
      }
      const orderNumber = `#${nextNum.toString().padStart(4, "0")}`;

      // FIX 2: Alterando o status para não poluir o Kanban antes do pagamento
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          client_id: selectedClient.id,
          seller_id: selectedSellerId,
          priority: "Normal",
          status: "aguardando_pagamento",
          payment_status: "PENDING",
          payment_method: billingType,
          delivery_address: selectedClient.city,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // FIX 1: Rateando o desconto no preço unitário dos itens (Matemática fiscal correta)
      const discountPercent = parseFloat(discount || "0") / 100;

      const itemsToInsert = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        qty: Number(item.qty) || 1,
        // Aplica a proporção do desconto diretamente no valor que vai pro banco
        price: item.price * (1 - discountPercent),
      }));

      await supabase.from("order_items").insert(itemsToInsert);

      await supabase.from("order_history").insert({
        order_id: order.id,
        status: "aguardando_pagamento",
        changed_by: "Admin Central",
        note: `Pedido criado aguardando pagamento. Método: ${billingType} (${installments}x). Total: ${fmt(total)}`,
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

      setPaymentResult(checkoutData);
      setConfirmed(true);
    } catch (error: any) {
      console.error("Erro ao fechar pedido:", error);
      alert(
        `Falha ao gerar venda/cobrança: ${error.message || "Erro desconhecido"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (confirmed)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Cobrança Gerada!</h2>

        {billingType === "PIX" && paymentResult?.pix ? (
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center mt-2">
            <p className="text-sm font-semibold text-foreground mb-4">
              Aguardando Pagamento PIX
            </p>
            <img
              src={`data:image/jpeg;base64,${paymentResult.pix.encodedImage}`}
              alt="QR Code PIX"
              className="w-48 h-48 border border-border rounded-xl p-2 mb-4"
            />
            <p className="text-xs text-muted-foreground mb-2">
              PIX Copia e Cola:
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
              A cobrança foi gerada com sucesso. Copie ou acesse o link para
              enviar ao cliente.
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
          <p className="text-sm text-muted-foreground max-w-xs mt-2">
            O pedido para <strong>{selectedClient?.name}</strong> foi registrado
            (Total: <strong>{fmt(total)}</strong>).
          </p>
        )}

        <button
          onClick={() => {
            setConfirmed(false);
            setSelectedClient(null);
            setOrderItems([]);
            setClientSearch("");
            setDiscount("0");
            setSelectedSellerId("");
            setPaymentResult(null);
            setInstallments(1);
          }}
          className="mt-4 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] transition-colors"
        >
          Novo Pedido
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Nova Venda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Criação rápida de pedido e cobrança (Painel Interno)
        </p>
      </div>

      {loadingData ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Dados da Venda
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Cliente
                  </label>
                  {selectedClient ? (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 border border-border">
                      <Avatar
                        initials={selectedClient.name.slice(0, 2).toUpperCase()}
                        color="bg-[#1e4023]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {selectedClient.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {selectedClient.doc} • {selectedClient.city}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedClient(null)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientDrop(true);
                        }}
                        onFocus={() => setShowClientDrop(true)}
                        placeholder="Buscar por nome..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                      />
                      {showClientDrop && clientSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                          {filteredClients.slice(0, 5).map((c) => (
                            <button
                              key={c.id}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                              onClick={() => {
                                setSelectedClient(c);
                                setClientSearch("");
                                setShowClientDrop(false);
                              }}
                            >
                              <Avatar
                                initials={c.name.slice(0, 2).toUpperCase()}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {c.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {c.doc}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Vendedor Responsável *
                  </label>
                  <div className="relative">
                    <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={selectedSellerId}
                      onChange={(e) =>
                        setSelectedSellerId(Number(e.target.value))
                      }
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition appearance-none cursor-pointer"
                    >
                      <option value="">Selecione o vendedor...</option>
                      {dbSellers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} - {s.region}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Adicionar Produtos
                </h3>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto pelo nome..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                    {filteredProducts.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                        onClick={() => addProduct(p)}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {p.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.category} • {p.stock} {p.unit} disponíveis
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-primary flex-shrink-0">
                          {fmt(p.price)}/{p.unit}
                        </span>
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
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 px-1">
                          Produto
                        </th>
                        <th className="text-center text-xs text-muted-foreground font-medium py-2 px-1 w-24">
                          Qtd
                        </th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 px-1 w-24">
                          Unit.
                        </th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 px-1 w-24">
                          Subtotal
                        </th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item) => (
                        <tr
                          key={item.productId}
                          className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                        >
                          <td className="py-2.5 px-1 font-medium text-foreground">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-1">
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) =>
                                updateQty(item.productId, e.target.value)
                              }
                              onBlur={() => {
                                if (!item.qty || Number(item.qty) < 1) {
                                  updateQty(item.productId, 1);
                                }
                              }}
                              className="w-full text-center px-2 py-1 rounded border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </td>
                          <td className="py-2.5 px-1 text-right text-muted-foreground">
                            {fmt(item.price)}
                          </td>
                          <td className="py-2.5 px-1 text-right font-semibold text-foreground">
                            {fmt((Number(item.qty) || 0) * item.price)}
                          </td>
                          <td className="py-2.5 pl-2">
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="p-1 rounded hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground"
                            >
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

            {orderItems.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Forma de Pagamento
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setBillingType("PIX")}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      billingType === "PIX"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-xs font-semibold">PIX</span>
                  </button>
                  <button
                    onClick={() => setBillingType("BOLETO")}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      billingType === "BOLETO"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <Barcode className="w-5 h-5" />
                    <span className="text-xs font-semibold">Boleto</span>
                  </button>
                  <button
                    onClick={() => setBillingType("CREDIT_CARD")}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      billingType === "CREDIT_CARD"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground hover:bg-secondary"
                    }`}
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

                  {(billingType === "CREDIT_CARD" ||
                    billingType === "BOLETO") && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">
                        {billingType === "BOLETO"
                          ? "Parcelas do Carnê"
                          : "Parcelamento"}
                      </label>
                      <select
                        value={installments}
                        onChange={(e) =>
                          setInstallments(Number(e.target.value))
                        }
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
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  4
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Resumo do Pedido
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Itens ({orderItems.length})</span>
                  <span>
                    {orderItems.reduce((a, i) => a + (Number(i.qty) || 0), 0)}{" "}
                    unidades
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">
                    {fmt(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Desconto (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-20 text-center px-2 py-1 rounded border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-red-500 text-xs">
                    <span>Desconto aplicado</span>
                    <span>- {fmt(discountVal)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="font-semibold text-foreground">
                    Total Final
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {fmt(total)}
                  </span>
                </div>
              </div>

              <button
                disabled={
                  !selectedClient ||
                  !selectedSellerId ||
                  orderItems.length === 0 ||
                  isSubmitting
                }
                onClick={handleConfirmOrder}
                className="mt-5 w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-[#163318] active:bg-[#0f2210] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Gerar Cobrança
                  </>
                )}
              </button>

              {(!selectedClient ||
                !selectedSellerId ||
                orderItems.length === 0) && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Preencha cliente, vendedor e adicione produtos para fechar.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
