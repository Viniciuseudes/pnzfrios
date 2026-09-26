import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERP_URL = process.env.BASE_ERP_API_URL || "https://api-sandbox.baseerp.com.br";
const ERP_KEY = process.env.BASE_ERP_API_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "ID do pedido não fornecido na requisição." }, { status: 400 });
    }

    // 1. Busca o base_erp_order_id no Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('base_erp_order_id')
      .eq('id', orderId)
      .single();

    if (orderErr) {
      return NextResponse.json({ success: false, error: `Erro na base de dados: ${orderErr.message}` }, { status: 500 });
    }

    if (!order?.base_erp_order_id) {
      return NextResponse.json({ 
        success: false, 
        error: "Este pedido ainda não tem um ID do ERP associado. Por favor, clique em 'Emitir NF-e' primeiro." 
      }, { status: 400 });
    }

    const baseErpOrderId = order.base_erp_order_id;

    // 2. Consulta o ERP
    const invoiceRes = await fetch(`${ERP_URL}/api/v1/salesOrders/${baseErpOrderId}/invoice`, {
      headers: { 'access_token': ERP_KEY }
    });

    const invoiceData = await invoiceRes.json().catch(() => null);

    if (!invoiceRes.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Erro no ERP (${invoiceRes.status}): ${invoiceData ? JSON.stringify(invoiceData) : 'Sem resposta do ERP'}` 
      }, { status: 500 });
    }

    // 3. Analisa o status retornado
    let novoStatus = 'PROCESSANDO';
    const statusAtual = invoiceData?.invoiceStatus || invoiceData?.status || '';

    if (statusAtual === 'EMITIDA' || statusAtual === 'AUTHORIZED') {
        novoStatus = 'EMITIDA';
    } else if (statusAtual === 'ERRO' || statusAtual === 'DENIED' || statusAtual === 'REJECTED') {
        novoStatus = 'ERRO';
    }

    const pdfUrl = invoiceData?.pdfUrl || invoiceData?.invoicePdfUrl || invoiceData?.publicUrl || invoiceData?.documentUrl || "";

    // 4. Atualiza o Supabase
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