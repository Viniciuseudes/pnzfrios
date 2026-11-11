import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Preencha e-mail e senha." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const hashedInput = hashPassword(String(password));

    const { data: acc, error } = await supabaseAdmin
      .from("accounts")
      .select("id, email, password_hash, role, name, avatar, seller_id")
      .eq("email", cleanEmail)
      .single();

    if (error || !acc) {
      return NextResponse.json(
        { success: false, error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Verifica se bate com o Hash SHA-256 (ou texto puro legado, atualizando se necessário)
    const isHashMatch = acc.password_hash === hashedInput;
    const isLegacyPlainMatch = acc.password_hash === password;

    if (!isHashMatch && !isLegacyPlainMatch) {
      return NextResponse.json(
        { success: false, error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Se era uma conta antiga em texto puro, converte para Hash automaticamente
    if (isLegacyPlainMatch && !isHashMatch) {
      await supabaseAdmin
        .from("accounts")
        .update({ password_hash: hashedInput })
        .eq("id", acc.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: acc.id,
        name: acc.name,
        email: acc.email,
        role: String(acc.role).trim().toLowerCase(),
        avatar: acc.avatar,
        sellerId: acc.seller_id || undefined,
      },
    });
  } catch (err: any) {
    console.error("[AUTH LOGIN ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Erro interno ao autenticar." },
      { status: 500 }
    );
  }
}