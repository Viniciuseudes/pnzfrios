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
    const { orderId } = await req.json();

    // 1. Buscamos o base_erp_order_id diretamente no Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('base_erp_order_id')
      .eq('id', orderId)
      .single();

    if (orderErr || !order?.base_erp_order_id) {
      throw new Error("ID do ERP não associado a este pedido. Tente emitir novamente.");
    }

    const baseErpOrderId = order.base_erp_order_id;

    // 2. Consultamos o status atual da Nota Fiscal usando o ID exato
    const invoiceRes = await fetch(`${ERP_URL}/api/v1/salesOrders/${baseErpOrderId}/invoice`, {
      headers: { 'access_token': ERP_KEY }
    });
    const invoiceData = await invoiceRes.json();

    // 3. Analisamos a resposta
    let novoStatus = 'PROCESSANDO';
    const statusAtual = invoiceData.invoiceStatus || invoiceData.status || '';

    if (statusAtual === 'EMITIDA' || statusAtual === 'AUTHORIZED') {
        novoStatus = 'EMITIDA';
    } else if (statusAtual === 'ERRO' || statusAtual === 'DENIED' || statusAtual === 'REJECTED') {
        novoStatus = 'ERRO';
    }

    const pdfUrl = invoiceData.pdfUrl || invoiceData.invoicePdfUrl || invoiceData.publicUrl || invoiceData.documentUrl || "";

    // 4. Atualizamos o Supabase com o resultado
    if (novoStatus !== 'PROCESSANDO' || pdfUrl) {
      await supabase
        .from('orders')
        .update({ 
          nfe_status: novoStatus,
          nfe_url: pdfUrl 
        })
        .eq('id', orderId);
    }

    return NextResponse.json({ 
      success: true, 
      status: novoStatus, 
      url: pdfUrl 
    });

  } catch (error: any) {
    console.error("Erro ao consultar NFe:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}