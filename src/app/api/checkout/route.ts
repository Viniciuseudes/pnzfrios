import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ASAAS_URL = "https://sandbox.asaas.com/api/v3";
const ASAAS_KEY = process.env.ASAAS_API_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, clientId, billingType, totalValue, dueDate, installments } = body;

    // 1. Busca os dados COMPLETOS do Cliente no Supabase
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientErr || !client) throw new Error("Cliente não encontrado no banco de dados.");

    let asaasCustomerId = client.asaas_customer_id;

    // 2. Se o cliente ainda não existe no Asaas, cria enviando o ENDEREÇO
    if (!asaasCustomerId) {
      const cleanDoc = client.doc ? client.doc.replace(/\D/g, '') : '';
      const cleanPhone = client.phone ? client.phone.replace(/\D/g, '') : '';
      const cleanCep = client.zip_code ? client.zip_code.replace(/\D/g, '') : '';

      const customerPayload: any = {
        name: client.name,
        cpfCnpj: cleanDoc,
        email: client.email,
        mobilePhone: cleanPhone,
      };

      if (cleanCep) customerPayload.postalCode = cleanCep;
      if (client.street) customerPayload.address = client.street;
      if (client.number) customerPayload.addressNumber = client.number;
      if (client.complement) customerPayload.complement = client.complement;
      if (client.neighborhood) customerPayload.province = client.neighborhood;

      const customerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_KEY },
        body: JSON.stringify(customerPayload)
      });
      
      const customerText = await customerRes.text();
      let customerData;
      try { customerData = JSON.parse(customerText); } catch (err) { throw new Error(`Asaas retornou um erro não-JSON na criação do cliente`); }

      if (!customerRes.ok) {
        throw new Error(customerData.errors?.[0]?.description || `Erro ao criar cliente no Asaas`);
      }
      asaasCustomerId = customerData.id;
      
      await supabase.from('clients').update({ asaas_customer_id: asaasCustomerId }).eq('id', clientId);
    }

    // 3. Monta o Vencimento Inicial
    const targetDueDate = dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const finalBillingType = billingType === 'UNDEFINED' ? 'PIX' : billingType;

    let paymentId = "";
    let invoiceUrl = "";
    let pixData = null;

    // 4. BIFURCAÇÃO: 1x (Pagamento Único) vs Parcelado (Carnê)
    if (installments > 1) {
      // FLUXO DE CARNÊ/PARCELAMENTO
      const installmentPayload = {
        customer: asaasCustomerId,
        billingType: finalBillingType,
        totalValue: totalValue,
        installmentCount: installments, // O Asaas divide o valor automaticamente
        dueDate: targetDueDate,
        externalReference: orderId.toString(),
        description: `Pedido de Compra #${orderId} - Parcelado em ${installments}x`
      };

      const instRes = await fetch(`${ASAAS_URL}/installments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_KEY },
        body: JSON.stringify(installmentPayload)
      });
      
      const instText = await instRes.text();
      let instData;
      try { instData = JSON.parse(instText); } catch (err) { throw new Error(`Erro na API de Carnês do Asaas`); }

      if (!instRes.ok) {
        throw new Error(instData.errors?.[0]?.description || `Erro ao gerar Carnê no Asaas`);
      }

      paymentId = instData.id; // Retorna o id do carnê

      // O Asaas não devolve o Link do Carnê direto. Buscamos a 1ª parcela gerada.
      const getPaymentsRes = await fetch(`${ASAAS_URL}/payments?installment=${paymentId}`, {
        headers: { 'access_token': ASAAS_KEY }
      });
      const getPaymentsText = await getPaymentsRes.text();
      try { 
        const getPaymentsData = JSON.parse(getPaymentsText);
        invoiceUrl = getPaymentsData.data?.[0]?.invoiceUrl || "";
      } catch (err) {}

    } else {
      // FLUXO À VISTA (1x)
      const paymentPayload: any = {
        customer: asaasCustomerId,
        billingType: finalBillingType,
        value: totalValue,
        dueDate: targetDueDate,
        externalReference: orderId.toString(),
        description: `Pedido de Compra #${orderId}`
      };

      const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_KEY },
        body: JSON.stringify(paymentPayload)
      });
      
      const paymentText = await paymentRes.text();
      let paymentData;
      try { paymentData = JSON.parse(paymentText); } catch (err) { throw new Error(`Erro na API de Cobrança do Asaas`); }

      if (!paymentRes.ok) {
        throw new Error(paymentData.errors?.[0]?.description || `Erro ao gerar cobrança no Asaas`);
      }

      paymentId = paymentData.id; 
      invoiceUrl = paymentData.invoiceUrl;

      // Se for PIX à vista, gera o QR Code na hora
      if (finalBillingType === 'PIX') {
        const pixRes = await fetch(`${ASAAS_URL}/payments/${paymentId}/pixQrCode`, {
          headers: { 'access_token': ASAAS_KEY }
        });
        const pixText = await pixRes.text();
        try { pixData = JSON.parse(pixText); } catch (err) {}
      }
    }

    // 5. Atualiza o Supabase com as informações
    await supabase.from('orders').update({
      asaas_payment_id: paymentId,
      payment_method: finalBillingType,
      payment_status: 'PENDING',
      payment_url: invoiceUrl
    }).eq('id', orderId);

    // Retorna para o Front-end
    return NextResponse.json({ 
      success: true, 
      paymentId: paymentId, 
      invoiceUrl: invoiceUrl,
      pix: pixData 
    });

  } catch (error: any) {
    console.error("[CHECKOUT ERROR]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}