import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERP_URL = (
  process.env.BASE_ERP_API_URL || "https://api-sandbox.baseerp.com.br"
).replace(/\/$/, "");

// Remove aspas duplas acidentais no início/fim da chave do .env.local
const ERP_KEY = (process.env.BASE_ERP_API_KEY || "").replace(/^"+|"+$/g, "").trim();

function extractErpError(data: any, status: number): string {
  if (!data) return `Erro HTTP ${status} ao comunicar com o Base ERP.`;
  if (typeof data === "string") return data;
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors
      .map((e: any) => e.description || e.message || JSON.stringify(e))
      .join(" | ");
  }
  if (data.message) return data.message;
  if (data.error) return typeof data.error === "string" ? data.error : JSON.stringify(data.error);
  return JSON.stringify(data);
}

async function getValidBankId(): Promise<number> {
  if (process.env.BASE_ERP_BANK_ID) {
    return Number(process.env.BASE_ERP_BANK_ID);
  }
  try {
    const res = await fetch(`${ERP_URL}/api/v1/bankAccounts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: ERP_KEY,
      },
    });
    if (res.ok) {
      const data = await res.json();
      const list = data?.content || data?.data || (Array.isArray(data) ? data : []);
      if (list.length > 0 && list[0].id) {
        return Number(list[0].id);
      }
    }
  } catch (e) {
    console.warn("[NFE] Não foi possível listar contas bancárias, usando fallback.");
  }
  return 100129450;
}

export async function POST(req: Request) {
  let orderId: string | null = null;
  let currentOrderStatus = "novo";
  let emittedBy = "Sistema (ERP)";

  try {
    const body = await req.json();
    orderId = body.orderId;
    emittedBy = body.emittedBy || "Gestor";

    if (!orderId) {
      throw new Error("ID do pedido não fornecido.");
    }

    if (!ERP_KEY) {
      throw new Error("Chave BASE_ERP_API_KEY não configurada no ambiente.");
    }

    // 1. Busca pedido completo com todos os dados de cliente e produtos
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        `
        id, order_number, status, payment_method, base_erp_order_id,
        clients (
          id, name, doc, phone, email, zip_code, street, number, complement, neighborhood, city, state, base_erp_id
        ),
        order_items (
          id, qty, price,
          products ( id, name, sku, unit, price, base_erp_id, ncm, cfop )
        )
      `
      )
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      throw new Error("Pedido não encontrado no banco de dados.");
    }

    currentOrderStatus = order.status || "novo";

    await supabase
      .from("orders")
      .update({ nfe_status: "PROCESSANDO" })
      .eq("id", orderId);

    const client: any = Array.isArray(order.clients)
      ? order.clients[0]
      : order.clients;

    if (!client) {
      throw new Error("Este pedido não possui um cliente válido vinculado.");
    }

    const cleanDoc = (client.doc || "").replace(/\D/g, "");
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      throw new Error(
        `O cliente "${client.name}" está sem CPF/CNPJ válido cadastrado (${client.doc || "vazio"}). Edite o cliente antes de emitir a NF-e.`
      );
    }

    // 2. AUTO-SYNC DO CLIENTE NO BASE ERP (Cria se não existir, atualiza se já existir)
    const safeAddress = {
      postalCode: client.zip_code ? client.zip_code.replace(/\D/g, "") : "59000000",
      address: client.street || "Rua Principal",
      addressNumber: client.number || "S/N",
      complement: client.complement || "",
      province: client.neighborhood || "Centro",
      cityName: client.city || "Petrolina",
      stateAbbrev: client.state || "PE",
      country: "Brasil",
    };

    const customerPayload = {
      name: client.name,
      cpfCnpj: cleanDoc,
      phone: (client.phone || "").replace(/\D/g, ""),
      email: client.email || "",
      billingAddress: safeAddress,
      deliveryAddress: safeAddress,
      taxInformation: {
        typeOfTaxPayer: "NAO_CONTRIBUINTE",
        finalConsumer: true,
        simpleTax: false,
        ruralProducer: false,
      },
    };

    let baseErpCustomerId = client.base_erp_id;

    if (!baseErpCustomerId) {
      const createCustRes = await fetch(`${ERP_URL}/api/v1/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ERP_KEY,
        },
        body: JSON.stringify(customerPayload),
      });
      const createCustData = await createCustRes.json().catch(() => null);
      if (!createCustRes.ok) {
        throw new Error(
          `Erro ao cadastrar cliente "${client.name}" no Base ERP: ${extractErpError(createCustData, createCustRes.status)}`
        );
      }
      baseErpCustomerId = createCustData.id.toString();
      await supabase
        .from("clients")
        .update({ base_erp_id: baseErpCustomerId })
        .eq("id", client.id);
    } else {
      // Atualiza os dados do cliente no ERP para garantir que edições recentes estejam sincronizadas
      await fetch(`${ERP_URL}/api/v1/customers/${baseErpCustomerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          access_token: ERP_KEY,
        },
        body: JSON.stringify(customerPayload),
      }).catch(() => null);
    }

    // 3. AUTO-SYNC DOS PRODUTOS E NCM NO BASE ERP (Enviando todos os campos obrigatórios)
    const syncedItems: { productId: number; quantity: number; unitPrice: number }[] = [];

    for (const item of order.order_items) {
      const product: any = Array.isArray(item.products)
        ? item.products[0]
        : item.products;

      if (!product) {
        throw new Error("Um dos produtos do pedido foi excluído do catálogo.");
      }

      const cleanNcm = (product.ncm || "").replace(/\D/g, "");
      if (cleanNcm.length !== 8) {
        throw new Error(
          `O produto "${product.name}" está com NCM inválido (${product.ncm || "vazio"}). Deve conter 8 dígitos.`
        );
      }

      let baseErpProductId = product.base_erp_id;
      const productPayload = {
        name: product.name,
        code: product.sku || `SKU-${product.id}`,
        ncm: cleanNcm,
        unit: (product.unit || "UN").toUpperCase().slice(0, 6),
        salePrice: Number(Number(product.price || item.price).toFixed(2)),
      };

      if (!baseErpProductId) {
        const createProdRes = await fetch(`${ERP_URL}/api/v1/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            access_token: ERP_KEY,
          },
          body: JSON.stringify(productPayload),
        });
        const createProdData = await createProdRes.json().catch(() => null);
        if (!createProdRes.ok) {
          throw new Error(
            `Erro ao cadastrar produto "${product.name}" no Base ERP: ${extractErpError(createProdData, createProdRes.status)}`
          );
        }
        baseErpProductId = createProdData.id.toString();
        await supabase
          .from("products")
          .update({ base_erp_id: baseErpProductId })
          .eq("id", product.id);
      } else {
        // PUT completo (com name e unit obrigatórios) para atualizar o NCM no Base ERP
        const updateProdRes = await fetch(
          `${ERP_URL}/api/v1/products/${baseErpProductId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              access_token: ERP_KEY,
            },
            body: JSON.stringify(productPayload),
          }
        );

        if (!updateProdRes.ok) {
          const updateProdData = await updateProdRes.json().catch(() => null);
          console.warn(
            `[NFE] Aviso ao atualizar produto ${product.name}:`,
            updateProdData
          );
        }
      }

      const roundedUnitPrice = Number(Number(item.price).toFixed(2));
      syncedItems.push({
        productId: Number(baseErpProductId),
        quantity: Number(item.qty),
        unitPrice: roundedUnitPrice,
      });
    }

    // 4. Calcula o total exato a partir dos itens arredondados (evita erro de 1 centavo na SEFAZ)
    const today = new Date().toISOString().split("T")[0];
    const exactOrderTotal = Number(
      syncedItems
        .reduce((acc, i) => acc + i.quantity * i.unitPrice, 0)
        .toFixed(2)
    );

    const bankId = await getValidBankId();

    let baseErpOrderId = order.base_erp_order_id;

    // 5. Cria o Pedido de Venda no Base ERP (se ainda não existir)
    if (!baseErpOrderId) {
      const createOrderPayload = {
        issueDate: today,
        customerId: Number(baseErpCustomerId),
        externalReference: `${order.id}-${Date.now()}`,
        orderItems: syncedItems,
        orderPayments: [
          {
            bankId: bankId,
            billingType: "PIX",
            dueDate: today,
            value: exactOrderTotal,
            generateCharge: false,
          },
        ],
      };

      const createOrderRes = await fetch(`${ERP_URL}/api/v1/salesOrders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ERP_KEY,
        },
        body: JSON.stringify(createOrderPayload),
      });

      const createOrderData = await createOrderRes.json().catch(() => null);
      if (!createOrderRes.ok) {
        throw new Error(
          `Base ERP recusou o Pedido de Venda: ${extractErpError(createOrderData, createOrderRes.status)}`
        );
      }

      baseErpOrderId = createOrderData.id.toString();

      await supabase
        .from("orders")
        .update({ base_erp_order_id: baseErpOrderId })
        .eq("id", orderId);
    }

    // 6. Solicita a emissão da NF-e (Modelo 55) — Tenta POST, e se já houver nota vinculada, tenta PUT (Reemitir)
    let invoiceRes = await fetch(
      `${ERP_URL}/api/v1/salesOrders/${baseErpOrderId}/invoice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ERP_KEY,
        },
        body: JSON.stringify({ type: "55" }),
      }
    );

    if (!invoiceRes.ok && invoiceRes.status === 400) {
      // Caso o pedido no ERP já tenha sofrido uma tentativa de emissão anterior, tenta reemitir via PUT
      const retryPutRes = await fetch(
        `${ERP_URL}/api/v1/salesOrders/${baseErpOrderId}/invoice`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            access_token: ERP_KEY,
          },
          body: JSON.stringify({ type: "55" }),
        }
      );
      if (retryPutRes.ok) {
        invoiceRes = retryPutRes;
      }
    }

    const invoiceData = await invoiceRes.json().catch(() => null);

    if (!invoiceRes.ok) {
      throw new Error(
        `Falha ao transmitir NF-e no Base ERP: ${extractErpError(invoiceData, invoiceRes.status)}`
      );
    }

    const rawStatus = (
      invoiceData?.invoiceStatus ||
      invoiceData?.status ||
      "PROCESSANDO"
    ).toUpperCase();

    const finalStatus = ["EMITIDA", "AUTHORIZED", "AUTORIZADA"].includes(rawStatus)
      ? "EMITIDA"
      : ["ERRO", "REJECTED", "REJEITADA", "DENIED"].includes(rawStatus)
        ? "ERRO"
        : "PROCESSANDO";

    const pdfUrl =
      invoiceData?.pdfUrl ||
      invoiceData?.invoicePdfUrl ||
      invoiceData?.publicUrl ||
      "";

    const rejectionReason =
      invoiceData?.statusReason ||
      invoiceData?.sefazMessage ||
      invoiceData?.errorMessage ||
      invoiceData?.message ||
      "";

    await supabase
      .from("orders")
      .update({
        nfe_status: finalStatus,
        nfe_url: pdfUrl || null,
        nfe_number: invoiceData?.invoiceNumber?.toString() || null,
      })
      .eq("id", orderId);

    await supabase.from("order_history").insert({
      order_id: orderId,
      status: currentOrderStatus,
      changed_by: emittedBy,
      note:
        finalStatus === "ERRO"
          ? `Rejeição na NF-e (${emittedBy}): ${rejectionReason || "Verifique Certificado A1 e Impostos no Base ERP."}`
          : `NF-e solicitada por ${emittedBy} via Base ERP (Pedido ERP #${baseErpOrderId}). Status: ${rawStatus}`,
    });

    if (finalStatus === "ERRO") {
      throw new Error(
        rejectionReason ||
          "A nota foi rejeitada pela SEFAZ. Verifique se o Certificado Digital A1 e a Inscrição Estadual estão configurados no Base ERP."
      );
    }

    return NextResponse.json({
      success: true,
      status: finalStatus,
      nfe_url: pdfUrl,
      nfe_number: invoiceData?.invoiceNumber,
      message: rejectionReason,
    });
  } catch (error: any) {
    console.error("[NFE ERROR]", error.message);

    if (orderId) {
      await supabase
        .from("orders")
        .update({ nfe_status: "ERRO" })
        .eq("id", orderId);

      await supabase.from("order_history").insert({
        order_id: orderId,
        status: currentOrderStatus,
        changed_by: emittedBy,
        note: `Erro ao emitir NF-e: ${error.message}`,
      });
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}