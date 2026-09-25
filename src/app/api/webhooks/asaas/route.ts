import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos o Service Role Key para garantir que o webhook tenha permissão de gravar no banco sem precisar de um usuário logado
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // --- INÍCIO DA TRAVA DE SEGURANÇA ---
    const asaasToken = req.headers.get('asaas-access-token');
    
    // Verifica se o token enviado na requisição bate com a variável de ambiente salva na Vercel
    if (!asaasToken || asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.error("Tentativa de acesso não autorizado ao webhook do Asaas.");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    // --- FIM DA TRAVA DE SEGURANÇA ---

    const body = await req.json();

    // O Asaas dispara vários eventos, mas só nos interessa quando o pagamento é recebido ou confirmado
    if (body.event === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_CONFIRMED') {
      const asaasPaymentId = body.payment.id;
      const externalReference = body.payment.externalReference; // Boas práticas: o Asaas devolve o ID do seu banco se você tiver enviado na criação

      // 1. Busca o pedido correspondente no Supabase
      // Adicionamos seller_id e order_number no select para o motor de notificações
      let query = supabase.from('orders').select('id, status, seller_id, order_number').limit(1);
      
      if (externalReference) {
        query = query.eq('id', externalReference);
      } else {
        query = query.eq('asaas_payment_id', asaasPaymentId);
      }

      const { data: orderData, error: fetchError } = await query.single();

      if (fetchError || !orderData) {
        console.error("Webhook Asaas: Pedido nao encontrado para o pagamento", asaasPaymentId);
        return NextResponse.json({ success: true, message: "Pagamento recebido, mas pedido nao localizado no sistema." });
      }

      // Evita atualizar pedidos que já foram cancelados ou já estão em estágios avançados
      if (orderData.status === 'aguardando_pagamento') {
        
        // 2. Atualiza o status do pedido para "novo" (aparece no Kanban) e o pagamento para "PAID"
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'novo',
            payment_status: 'PAID'
          })
          .eq('id', orderData.id);

        if (updateError) throw updateError;

        // 3. Registra no histórico do pedido de forma limpa
        await supabase.from('order_history').insert({
          order_id: orderData.id,
          status: 'novo',
          changed_by: 'Sistema (Asaas)',
          note: 'Pagamento confirmado automaticamente pelo Asaas. Pedido liberado para separação.'
        });

        console.log(`Pedido ${orderData.order_number} atualizado para 'novo' apos pagamento.`);

        // --- INICIO DO MOTOR DE NOTIFICACOES PUSH (DUPLO) ---
        // Construimos a URL dinamicamente para funcionar local e na Vercel
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        try {
          // Gatilho 1: Notifica o Gestor (Admin)
          await fetch(`${baseUrl}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: "admin",
              title: "Pagamento Recebido",
              body: `O pedido ${orderData.order_number} foi pago e liberado para o estoque.`,
              url: "/admin/pedidos"
            })
          });

          // Gatilho 2: Notifica o Vendedor que realizou a venda
          if (orderData.seller_id) {
            await fetch(`${baseUrl}/api/push/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetUserId: orderData.seller_id,
                title: "Pagamento Confirmado",
                body: `O pagamento da sua venda ${orderData.order_number} acabou de ser compensado.`,
                url: "/seller/dashboard"
              })
            });
          }
        } catch (pushErr) {
          console.error("Falha ao disparar notificacoes do webhook:", pushErr);
        }
        // --- FIM DO MOTOR DE NOTIFICACOES ---
      }
    }

    // Sempre devemos retornar status 200 para o Asaas, senão ele acha que deu erro e tenta enviar de novo várias vezes
    return NextResponse.json({ success: true, message: "Webhook processado com sucesso" });
    
  } catch (error: any) {
    console.error("Erro no Webhook do Asaas:", error);
    // Em caso de erro grave no nosso código, retornamos 500 para o Asaas tentar novamente mais tarde
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}