import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERP_URL = process.env.BASE_ERP_API_URL || "https://api-sandbox.baseerp.com.br";
const ERP_KEY = process.env.BASE_ERP_API_KEY!;

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData ? JSON.stringify(errData) : `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

export async function POST(req: Request) {
  let orderId: string | null = null;

  try {
    const body = await req.json();
    orderId = body.orderId;

    if (!orderId) {
      throw new Error("ID do pedido não fornecido.");
    }

    await supabase.from('orders').update({ nfe_status: 'PROCESSANDO' }).eq('id', orderId);

    // 1. Busca os dados do pedido e traz também o campo 'ncm' dos produtos
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        id, order_number, payment_method,
        clients ( id, name, base_erp_id ),
        order_items ( qty, price, products ( id, name, base_erp_id, ncm ) )
      `)
      .eq('id', orderId)
      .single();

    if (orderErr || !order) throw new Error("Pedido não encontrado no banco de dados.");

    const client: any = Array.isArray(order.clients) ? order.clients[0] : order.clients;
    const today = new Date().toISOString().split('T')[0];
    const orderTotal = order.order_items.reduce((acc: number, item: any) => acc + (item.qty * item.price), 0);

    // 2. Garante que os NCMs salvos no Supabase sejam sincronizados com o Base ERP antes de emitir a nota
    for (const item of order.order_items) {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;

      if (!product?.base_erp_id) {
        throw new Error(`Produto "${product?.name || 'Desconhecido'}" não está sincronizado com o ERP.`);
      }

      if (!product?.ncm) {
        throw new Error(`Produto "${product?.name}" está sem NCM cadastrado.`);
      }

      // Atualiza o cadastro do produto no Base ERP com o NCM atualizado
      await fetch(`${ERP_URL}/api/v1/products/${product.base_erp_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ERP_KEY
        },
        body: JSON.stringify({ ncm: product.ncm })
      }).catch(err => {
        console.warn(`[NFE WARN] Falha ao sincronizar NCM do produto ${product.id} no ERP:`, err);
      });
    }

    // 3. Monta o payload do pedido de venda
    const createOrderPayload = {
      issueDate: today,
      customerId: Number(client.base_erp_id),
      externalReference: order.id.toString(),
      orderItems: order.order_items.map((item: any) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        return {
          productId: Number(product.base_erp_id),
          quantity: item.qty,
          unitPrice: item.price
        };
      }),
      orderPayments: [
        {
          bankId: process.env.BASE_ERP_BANK_ID ? Number(process.env.BASE_ERP_BANK_ID) : 100129450, 
          billingType: "UNDEFINED", 
          dueDate: today,
          value: orderTotal,
          generateCharge: false
        }
      ]
    };

    // 4. Cria o Pedido de Venda no ERP
    const createOrderRes = await fetch(`${ERP_URL}/api/v1/salesOrders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ERP_KEY
      },
      body: JSON.stringify(createOrderPayload)
    });

    const createOrderData = await createOrderRes.json().catch(() => null);

    if (!createOrderRes.ok) {
       throw new Error(`Falha ao criar pedido no ERP: ${createOrderData ? JSON.stringify(createOrderData) : createOrderRes.status}`);
    }

    const baseErpOrderId = createOrderData.id;

    // Guardar o ID do pedido gerado no ERP
    await supabase.from('orders').update({
      base_erp_order_id: baseErpOrderId.toString()
    }).eq('id', orderId);

    // 5. Solicita a emissão da NF-e (Modelo 55)
    const invoiceRes = await fetchWithRetry(`${ERP_URL}/api/v1/salesOrders/${baseErpOrderId}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ERP_KEY
      },
      body: JSON.stringify({ type: "55" })
    });

    const finalStatus = invoiceRes.invoiceStatus === 'EMITIDA' ? 'EMITIDA' : 'PROCESSANDO';

    await supabase.from('orders').update({
      nfe_status: finalStatus,
      nfe_number: invoiceRes.invoiceNumber?.toString(),
    }).eq('id', orderId);

    await supabase.from('order_history').insert({
      order_id: orderId,
      status: 'novo',
      changed_by: 'Sistema (ERP)',
      note: `Nota Fiscal solicitada via Base ERP. Status: ${invoiceRes.invoiceStatus}`
    });

    return NextResponse.json({ 
      success: true, 
      status: finalStatus,
      nfe_number: invoiceRes.invoiceNumber 
    });

  } catch (error: any) {
    console.error("❌ [NFE ERROR]", error.message);
    
    if (orderId) {
      await supabase.from('orders').update({ nfe_status: 'ERRO' }).eq('id', orderId);
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}