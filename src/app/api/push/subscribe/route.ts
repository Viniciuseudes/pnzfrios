import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos a chave Mestra (Service Role) pois esta rota roda com segurança no servidor.
// Isso permite salvar no banco ignorando a trava do RLS.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json();

    if (!userId || !subscription) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Deleta inscrições antigas idênticas para não duplicar envios para o mesmo aparelho
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('subscription->>endpoint', subscription.endpoint);

    // Salva o novo celular/navegador atrelado ao usuário
    const { error } = await supabaseAdmin.from('push_subscriptions').insert({
      user_id: userId.toString(),
      subscription: subscription
    });

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro no Subscribe:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}