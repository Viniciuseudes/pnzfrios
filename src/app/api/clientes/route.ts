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

    const safeAddress = {
      postalCode: body.zip_code ? body.zip_code.replace(/\D/g, "") : "59000000",
      address: body.street || "Não informado",
      addressNumber: body.number || "S/N",
      complement: body.complement || "",
      province: body.neighborhood || "Centro",
      cityName: body.city || "Natal",
      stateAbbrev: body.state || "RN",
      country: "Brasil",
    };

    const taxInfo = {
      typeOfTaxPayer: "NAO_CONTRIBUINTE",
      finalConsumer: true,
      simpleTax: false,
      ruralProducer: false,
    };

    const erpRes = await fetch(`${ERP_URL}/api/v1/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ERP_KEY,
      },
      body: JSON.stringify({
        name: body.name,
        cpfCnpj: body.doc?.replace(/\D/g, ""),
        phone: body.phone?.replace(/\D/g, "") || "",
        email: body.email || "",
        billingAddress: safeAddress,
        deliveryAddress: safeAddress,
        taxInformation: taxInfo,
      }),
    });

    const erpData = await erpRes.json();
    if (!erpRes.ok) throw new Error(`Erro ERP: ${JSON.stringify(erpData)}`);

    const { ibge_code, ...supabaseData } = body;

    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        ...supabaseData,
        base_erp_id: erpData.id.toString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error("Erro ao sincronizar cliente:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { clientId, password, adminEmail, adminName } = await req.json();

    if (!clientId || !password) {
      return NextResponse.json(
        { success: false, error: "ID do cliente e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const hashedInput = hashPassword(String(password));

    // Busca os gestores cadastrados para validar a senha do admin logado
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

    // Filtra pelo gestor logado (por e-mail ou nome) ou verifica entre os gestores ativos
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
          error: "Senha incorreta. A exclusão do cliente foi bloqueada.",
        },
        { status: 401 }
      );
    }

    // 1. Remove paradas de rotas vinculadas a este cliente
    await supabase.from("route_stops").delete().eq("client_id", clientId);

    // 2. Desvincula pedidos antigos para preservar o histórico financeiro ("Cliente Excluído")
    await supabase
      .from("orders")
      .update({ client_id: null })
      .eq("client_id", clientId);

    // 3. Exclui o cliente definitivamente
    const { error: deleteErr } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao excluir cliente:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno ao excluir cliente.",
      },
      { status: 500 }
    );
  }
}