import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERP_URL = process.env.BASE_ERP_API_URL || "https://api-sandbox.baseerp.com.br";
const ERP_KEY = process.env.BASE_ERP_API_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const safeAddress = {
      postalCode: body.zip_code ? body.zip_code.replace(/\D/g, '') : "59000000",
      address: body.street || "Não informado",
      addressNumber: body.number || "S/N",
      complement: body.complement || "",
      province: body.neighborhood || "Centro",
      cityName: body.city || "Natal",
      stateAbbrev: body.state || "RN",
      country: "Brasil"
    };

    // 1. BLINDAGEM FISCAL COM A NOMENCLATURA EXATA EM PORTUGUÊS
    const taxInfo = {
      typeOfTaxPayer: "NAO_CONTRIBUINTE", // <--- O Segredo estava aqui!
      finalConsumer: true,
      simpleTax: false,
      ruralProducer: false
    };

    const erpRes = await fetch(`${ERP_URL}/api/v1/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ERP_KEY
      },
      body: JSON.stringify({
        name: body.name,
        cpfCnpj: body.doc?.replace(/\D/g, ''),
        phone: body.phone?.replace(/\D/g, '') || "",
        email: body.email || "",
        billingAddress: safeAddress,
        deliveryAddress: safeAddress,
        taxInformation: taxInfo
      })
    });

    const erpData = await erpRes.json();
    if (!erpRes.ok) throw new Error(`Erro ERP: ${JSON.stringify(erpData)}`);

    const { ibge_code, ...supabaseData } = body;

    const { data: client, error } = await supabase.from('clients').insert({
      ...supabaseData,
      base_erp_id: erpData.id.toString()
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error("Erro ao sincronizar cliente:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}