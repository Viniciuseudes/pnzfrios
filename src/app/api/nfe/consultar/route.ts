import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERP_URL = (process.env.BASE_ERP_API_URL || "https://api-sandbox.baseerp.com.br").replace(/\/$/, "");
const ERP_KEY = process.env.BASE_ERP_API_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "ID do pedido não fornecido." }, { status: 400 });
    }

    // 1. Busca o base_erp_order_id no Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('base_erp_order_id')
      .eq('id', orderId)
      .single();

    if (orderErr || !order?.base_erp_order_id) {
      return NextResponse.json({ 
        success: false, 
        error: "Este pedido não possui ID do ERP associado." 
      }, { status: 400 });
    }

    const baseErpOrderId = order.base_erp_order_id;

    // 2. Conforme a documentação oficial (Recuperar um único pedido via GET)
    const targetUrl = `${ERP_URL}/api/v1/salesOrders/${baseErpOrderId}`;
    console.log(`🔍 [API Consultar] A consultar pedido no ERP: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ERP_KEY
      }
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Erro no ERP (${response.status}): ${responseData?.message || JSON.stringify(responseData)}` 
      }, { status: 500 });
    }

    // 3. Extrai o status da NF-e e o PDF de dentro do objeto do pedido retornado pelo ERP
    // (Ajuste as propriedades abaixo conforme o JSON exato que o Base ERP devolve no GET /salesOrders/{id})
    const nfeInfo = responseData?.invoice || responseData?.nfe || responseData;
    const statusAtual = nfeInfo?.invoiceStatus || nfeInfo?.status || nfeInfo?.nfeStatus || 'PROCESSANDO';
    const pdfUrl = nfeInfo?.pdfUrl || nfeInfo?.invoicePdfUrl || nfeInfo?.publicUrl || "";

    let novoStatus = 'PROCESSANDO';
    if (['EMITIDA', 'AUTHORIZED', 'APPROVED', 'AUTORIZADA'].includes(statusAtual.toUpperCase())) {
        novoStatus = 'EMITIDA';
    } else if (['ERRO', 'DENIED', 'REJECTED', 'REJEITADA'].includes(statusAtual.toUpperCase())) {
        novoStatus = 'ERRO';
    }

    // 4. Atualiza no Supabase
    await supabase
      .from('orders')
      .update({ 
        nfe_status: novoStatus,
        nfe_url: pdfUrl 
      })
      .eq('id', orderId);

    return NextResponse.json({ 
      success: true, 
      status: novoStatus, 
      url: pdfUrl 
    });

  } catch (error: any) {
    console.error("❌ Erro interno ao consultar NFe:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}