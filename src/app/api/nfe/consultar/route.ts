import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERP_URL = "https://api-sandbox.baseerp.com.br";
const ERP_KEY = process.env.BASE_ERP_API_KEY!;

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    // 1. Buscamos o Pedido de Venda no Base ERP usando o ID do nosso sistema
    const searchRes = await fetch(`${ERP_URL}/api/v1/salesOrders?externalReference=${orderId}`, {
      headers: { 'access_token': ERP_KEY }
    });
    const searchData = await searchRes.json();
    
    if (!searchData || !searchData.data || searchData.data.length === 0) {
      throw new Error("Pedido não encontrado no ERP.");
    }

    const baseErpOrderId = searchData.data[0].id;

    // 2. Consultamos o status atual da Nota Fiscal desse pedido
    const invoiceRes = await fetch(`${ERP_URL}/api/v1/salesOrders/${baseErpOrderId}/invoice`, {
      headers: { 'access_token': ERP_KEY }
    });
    const invoiceData = await invoiceRes.json();

    // 3. Analisamos a resposta (O Base ERP usa diversas nomenclaturas dependendo do estado)
    let novoStatus = 'PROCESSANDO';
    const statusAtual = invoiceData.invoiceStatus || invoiceData.status || '';

    if (statusAtual === 'EMITIDA' || statusAtual === 'AUTHORIZED') {
        novoStatus = 'EMITIDA';
    } else if (statusAtual === 'ERRO' || statusAtual === 'DENIED' || statusAtual === 'REJECTED') {
        novoStatus = 'ERRO';
    }

    // Buscamos a URL do PDF na resposta
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