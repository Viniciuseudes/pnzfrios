import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERP_URL =
  process.env.BASE_ERP_API_URL || "https://api-sandbox.baseerp.com.br";
const ERP_KEY = process.env.BASE_ERP_API_KEY!;

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Cadastra no Base ERP primeiro
    const erpRes = await fetch(`${ERP_URL}/api/v1/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ERP_KEY,
      },
      body: JSON.stringify({
        name: body.name,
        code: body.sku || `SKU-${Date.now()}`,
        ncm: "21069090",
        unit: body.unit || "UN",
        salePrice: body.price,
      }),
    });

    const erpData = await erpRes.json();
    if (!erpRes.ok) throw new Error(`Erro ERP: ${JSON.stringify(erpData)}`);

    // 2. Salva no Supabase já com o ID do ERP amarrado
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        ...body,
        base_erp_id: erpData.id.toString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("Erro ao sincronizar produto:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { productId, password, adminEmail, adminName } = await req.json();

    if (!productId || !password) {
      return NextResponse.json(
        { success: false, error: "ID do produto e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const hashedInput = hashPassword(String(password));

    const { data: gestores, error: authErr } = await supabase
      .from("accounts")
      .select("id, email, name, password_hash, role")
      .eq("role", "gestor");

    if (authErr || !gestores || gestores.length === 0) {
      return NextResponse.json(
        { success: false, error: "Conta de gestor não localizada." },
        { status: 401 }
      );
    }

    const targetGestor =
      gestores.find(
        (g) =>
          (adminEmail &&
            g.email.toLowerCase() === String(adminEmail).toLowerCase()) ||
          (adminName &&
            g.name.toLowerCase() === String(adminName).toLowerCase())
      ) || null;

    const candidates = targetGestor ? [targetGestor] : gestores;
    const isAuthorized = candidates.some(
      (g) => g.password_hash === hashedInput || g.password_hash === password
    );

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: "Senha incorreta. A exclusão do produto foi bloqueada.",
        },
        { status: 401 }
      );
    }

    // 1. Desvincula de order_items antigos para manter o histórico de vendas ("Produto Excluído")
    await supabase
      .from("order_items")
      .update({ product_id: null })
      .eq("product_id", productId);

    // 2. Exclui o produto definitivamente
    const { error: deleteErr } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao excluir produto:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno ao excluir produto.",
      },
      { status: 500 }
    );
  }
}