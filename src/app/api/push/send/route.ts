import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configuração do motor de Push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Chave Mestra para ler as inscrições no banco protegido por RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { targetUserId, title, body, url } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Usuário destino não informado" }, { status: 400 });
    }

    // Busca todos os aparelhos do usuário destino (pode ser "admin" ou o ID do vendedor)
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', targetUserId.toString());

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "Nenhum aparelho inscrito para este usuário." });
    }

    const payload = JSON.stringify({ title, body, url });

    // Dispara a notificação para todos os aparelhos daquela pessoa
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription as any, payload);
      } catch (err: any) {
        // Se der erro 410 (Gone) ou 404, o usuário revogou a permissão no celular.
        // O sistema Sênior limpa o lixo do banco de dados automaticamente!
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error("Erro ao disparar push para o ID", sub.id, err);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, disparados: subscriptions.length });
  } catch (error: any) {
    console.error("Erro no envio do Push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}