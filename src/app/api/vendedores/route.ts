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
    const { name, region, target, avatar, email, password } = await req.json();

    if (!name || !region || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Cria o vendedor na tabela sellers
    const { data: sellerData, error: sellerError } = await supabaseAdmin
      .from("sellers")
      .insert([
        {
          name,
          region,
          target: Number(target) || 0,
          avatar,
          achieved: 0,
          orders_count: 0,
        },
      ])
      .select()
      .single();

    if (sellerError) throw sellerError;

    // 2. Cria a conta na tabela accounts já com a senha em Hash SHA-256
    const { error: accountError } = await supabaseAdmin.from("accounts").insert([
      {
        email: String(email).trim().toLowerCase(),
        password_hash: hashPassword(String(password)),
        role: "vendedor",
        name,
        avatar,
        seller_id: sellerData.id,
      },
    ]);

    if (accountError) {
      // Rollback do seller criado caso o e-mail já exista
      await supabaseAdmin.from("sellers").delete().eq("id", sellerData.id);
      if (accountError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "Este e-mail já está sendo usado por outro usuário.",
          },
          { status: 409 }
        );
      }
      throw accountError;
    }

    return NextResponse.json({ success: true, seller: sellerData });
  } catch (err: any) {
    console.error("[CREATE SELLER ERROR]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao cadastrar vendedor." },
      { status: 500 }
    );
  }
}