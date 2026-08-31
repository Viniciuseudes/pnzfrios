import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERP_URL = "https://api-sandbox.baseerp.com.br";
const ERP_KEY = process.env.BASE_ERP_API_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Cadastra no Base ERP primeiro
    const erpRes = await fetch(`${ERP_URL}/api/v1/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ERP_KEY
      },
      body: JSON.stringify({
        name: body.name,
        code: body.sku || `SKU-${Date.now()}`,
        ncm: "21069090", // NCM Genérico padrão (pode vir do body depois)
        unit: body.unit || "UN",
        salePrice: body.price
      })
    });

    const erpData = await erpRes.json();
    if (!erpRes.ok) throw new Error(`Erro ERP: ${JSON.stringify(erpData)}`);

    // 2. Salva no Supabase já com o ID do ERP amarrado
    const { data: product, error } = await supabase.from('products').insert({
      ...body,
      base_erp_id: erpData.id.toString()
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("Erro ao sincronizar produto:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}