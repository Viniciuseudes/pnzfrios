import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERP_URL = (
  process.env.BASE_ERP_API_URL || "https://api-sandbox.baseerp.com.br"
).replace(/\/$/, "");
const ERP_KEY = (process.env.BASE_ERP_API_KEY || "")
  .replace(/^"+|"+$/g, "")
  .trim();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "ID do pedido não fornecido." },
        { status: 400 }
      );
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("base_erp_order_id, status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order?.base_erp_order_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Este pedido ainda não possui ID do Base ERP associado. Clique em Emitir NF-e primeiro.",
        },
        { status: 400 }
      );
    }

    const baseErpOrderId = order.base_erp_order_id;
    const targetUrl = `${ERP_URL}/api/v1/salesOrders/${baseErpOrderId}`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: ERP_KEY,
      },
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Erro no ERP (${response.status}): ${
            responseData?.message || JSON.stringify(responseData)
          }`,
        },
        { status: 500 }
      );
    }

    const nfeInfo =
      responseData?.invoice || responseData?.nfe || responseData || {};

    const statusAtual = String(
      nfeInfo?.invoiceStatus ||
        nfeInfo?.status ||
        nfeInfo?.nfeStatus ||
        responseData?.invoiceStatus ||
        "PROCESSANDO"
    ).toUpperCase();

    const pdfUrl =
      nfeInfo?.pdfUrl ||
      nfeInfo?.invoicePdfUrl ||
      nfeInfo?.publicUrl ||
      nfeInfo?.danfeUrl ||
      responseData?.invoicePdfUrl ||
      "";

    const invoiceNumber =
      nfeInfo?.invoiceNumber ||
      nfeInfo?.number ||
      responseData?.invoiceNumber ||
      null;

    // Captura a razão exata caso a SEFAZ tenha rejeitado a nota
    const rejectionReason =
      nfeInfo?.statusReason ||
      nfeInfo?.sefazMessage ||
      nfeInfo?.errorMessage ||
      nfeInfo?.rejectionReason ||
      nfeInfo?.observations ||
      responseData?.invoiceErrorMessage ||
      "";

    let novoStatus = "PROCESSANDO";
    if (
      ["EMITIDA", "AUTHORIZED", "APPROVED", "AUTORIZADA", "ISSUED"].includes(
        statusAtual
      )
    ) {
      novoStatus = "EMITIDA";
    } else if (
      [
        "ERRO",
        "ERROR",
        "DENIED",
        "REJECTED",
        "REJEITADA",
        "CANCELED",
      ].includes(statusAtual)
    ) {
      novoStatus = "ERRO";
    }

    await supabase
      .from("orders")
      .update({
        nfe_status: novoStatus,
        nfe_url: pdfUrl || null,
        ...(invoiceNumber ? { nfe_number: invoiceNumber.toString() } : {}),
      })
      .eq("id", orderId);

    if (novoStatus === "ERRO" && rejectionReason) {
      await supabase.from("order_history").insert({
        order_id: orderId,
        status: order.status || "novo",
        changed_by: "SEFAZ / Base ERP",
        note: `Rejeição SEFAZ: ${rejectionReason}`,
      });
    }

    return NextResponse.json({
      success: true,
      status: novoStatus,
      url: pdfUrl,
      nfe_number: invoiceNumber,
      reason: rejectionReason,
      rawErpStatus: statusAtual,
    });
  } catch (error: any) {
    console.error("Erro interno ao consultar NFe:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno no servidor",
      },
      { status: 500 }
    );
  }
}