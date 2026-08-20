import type { KanbanOrder, OrderStatus, OrderHistoryEntry } from "@/types";

export const KANBAN_COLS: {
  id: OrderStatus; label: string; color: string; bg: string; border: string; dot: string;
}[] = [
  { id: "novo",      label: "Novo Pedido",  color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  dot: "bg-amber-500"   },
  { id: "analise",   label: "Em Análise",   color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-500"    },
  { id: "aprovado",  label: "Aprovado",     color: "text-indigo-700",  bg: "bg-indigo-50",  border: "border-indigo-200", dot: "bg-indigo-500"  },
  { id: "separacao", label: "Separação",    color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200", dot: "bg-violet-500"  },
  { id: "em_rota",   label: "Em Rota",      color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200", dot: "bg-orange-500"  },
  { id: "entregue",  label: "Entregue",     color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  { id: "cancelado", label: "Cancelado",    color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",    dot: "bg-red-400"     },
];

export const STATUS_FLOW: OrderStatus[] = ["novo", "analise", "aprovado", "separacao", "em_rota", "entregue"];

const mkOrder = (
  id: string, num: string, cid: number, cname: string, sid: number, sname: string, sav: string,
  items: { name: string; qty: number; price: number }[], priority: "Normal" | "Urgente",
  status: OrderStatus, created: string, notes: string, addr: string,
  history: OrderHistoryEntry[]
): KanbanOrder => ({
  id, orderNumber: num, clientId: cid, clientName: cname,
  sellerId: sid, sellerName: sname, sellerAvatar: sav,
  items, total: items.reduce((a, i) => a + i.qty * i.price, 0),
  priority, status, createdAt: created,
  updatedAt: history[history.length - 1]?.time ?? created,
  notes, deliveryAddress: addr, history,
});

export const initialKanbanOrders: KanbanOrder[] = [
  mkOrder("k1", "#0041", 1, "Supermercado Bom Preço Ltda", 1, "Vinicius Eudes", "VE",
    [{ name: "Frango Inteiro Cong.", qty: 30, price: 18.90 }, { name: "Linguiça Toscana", qty: 15, price: 22.80 }],
    "Urgente", "novo", "2025-07-30 08:14", "Entregar antes das 10h. Portão lateral.", "Av. Souza Filho, 320 — Petrolina, PE",
    [{ status: "novo", time: "2025-07-30 08:14", by: "Vinicius Eudes", note: "Pedido criado pelo vendedor" }]),
  mkOrder("k2", "#0042", 3, "Mercado Família Silva", 1, "Vinicius Eudes", "VE",
    [{ name: "Queijo Mussarela Fat.", qty: 8, price: 42.00 }],
    "Normal", "novo", "2025-07-30 09:30", "", "R. das Acácias, 88 — Petrolina, PE",
    [{ status: "novo", time: "2025-07-30 09:30", by: "Vinicius Eudes" }]),
  mkOrder("k3", "#0038", 2, "Distribuidora Vale do SF", 2, "Larissa Fernandes", "LF",
    [{ name: "Peito de Frango S/O", qty: 20, price: 24.50 }, { name: "Coxa e Sobrecoxa", qty: 25, price: 16.40 }],
    "Normal", "analise", "2025-07-29 14:20", "Checar prazo de validade dos lotes.", "Rod. BR-407 km 12 — Petrolina, PE",
    [{ status: "novo", time: "2025-07-29 14:20", by: "Larissa Fernandes" }, { status: "analise", time: "2025-07-29 15:05", by: "Admin Central", note: "Em verificação de estoque" }]),
  mkOrder("k4", "#0037", 5, "Lanchonete do Zé", 3, "Tamires Gomes", "TG",
    [{ name: "Salsicha Hot Dog", qty: 10, price: 14.20 }, { name: "Presunto Coz. Fat.", qty: 5, price: 31.00 }],
    "Urgente", "analise", "2025-07-29 11:00", "Precisa até amanhã cedo.", "R. Cel. Borges, 50 — Ouricuri, PE",
    [{ status: "novo", time: "2025-07-29 11:00", by: "Tamires Gomes" }, { status: "analise", time: "2025-07-29 11:40", by: "Admin Central" }]),
  mkOrder("k5", "#0035", 6, "Restaurante Sabor do Sertão", 4, "Valgustan Junior", "VJ",
    [{ name: "Frango Inteiro Cong.", qty: 20, price: 18.90 }, { name: "Queijo Prato Premium", qty: 6, price: 38.50 }],
    "Normal", "aprovado", "2025-07-28 16:00", "", "Pç. da Bandeira, 12 — Juazeiro, BA",
    [{ status: "novo", time: "2025-07-28 16:00", by: "Valgustan Junior" }, { status: "analise", time: "2025-07-28 16:45", by: "Admin Central" }, { status: "aprovado", time: "2025-07-28 17:20", by: "Admin Central", note: "Estoque confirmado. Autorizado." }]),
  mkOrder("k6", "#0034", 1, "Supermercado Bom Preço Ltda", 2, "Larissa Fernandes", "LF",
    [{ name: "Linguiça Toscana", qty: 40, price: 22.80 }, { name: "Salsicha Hot Dog", qty: 20, price: 14.20 }],
    "Normal", "aprovado", "2025-07-28 09:00", "Reposição quinzenal.", "Av. Souza Filho, 320 — Petrolina, PE",
    [{ status: "novo", time: "2025-07-28 09:00", by: "Larissa Fernandes" }, { status: "analise", time: "2025-07-28 09:30", by: "Admin Central" }, { status: "aprovado", time: "2025-07-28 10:15", by: "Admin Central" }]),
  mkOrder("k7", "#0032", 7, "Mini Mercado Central", 3, "Tamires Gomes", "TG",
    [{ name: "Peito de Frango S/O", qty: 10, price: 24.50 }],
    "Normal", "separacao", "2025-07-27 10:00", "", "R. Sete de Setembro, 201 — Juazeiro, BA",
    [{ status: "novo", time: "2025-07-27 10:00", by: "Tamires Gomes" }, { status: "analise", time: "2025-07-27 10:30", by: "Admin Central" }, { status: "aprovado", time: "2025-07-27 11:00", by: "Admin Central" }, { status: "separacao", time: "2025-07-27 13:00", by: "Admin Central", note: "Estoque separado no galpão B" }]),
  mkOrder("k8", "#0031", 4, "Açougue Premium Carnes", 4, "Valgustan Junior", "VJ",
    [{ name: "Frango Inteiro Cong.", qty: 25, price: 18.90 }, { name: "Coxa e Sobrecoxa", qty: 15, price: 16.40 }],
    "Urgente", "separacao", "2025-07-27 08:00", "Urgente — cliente reativado!", "R. Dom Pedro II, 77 — Ouricuri, PE",
    [{ status: "novo", time: "2025-07-27 08:00", by: "Valgustan Junior" }, { status: "analise", time: "2025-07-27 08:20", by: "Admin Central" }, { status: "aprovado", time: "2025-07-27 08:45", by: "Admin Central" }, { status: "separacao", time: "2025-07-27 09:30", by: "Admin Central" }]),
  mkOrder("k9", "#0029", 2, "Distribuidora Vale do SF", 1, "Vinicius Eudes", "VE",
    [{ name: "Queijo Mussarela Fat.", qty: 12, price: 42.00 }, { name: "Queijo Prato Premium", qty: 8, price: 38.50 }],
    "Normal", "em_rota", "2025-07-26 07:30", "Entregar com nota fiscal.", "Rod. BR-407 km 12 — Petrolina, PE",
    [{ status: "novo", time: "2025-07-26 07:30", by: "Vinicius Eudes" }, { status: "analise", time: "2025-07-26 08:00", by: "Admin Central" }, { status: "aprovado", time: "2025-07-26 08:30", by: "Admin Central" }, { status: "separacao", time: "2025-07-26 09:00", by: "Admin Central" }, { status: "em_rota", time: "2025-07-26 11:00", by: "Admin Central", note: "Motorista Josué saiu às 11h" }]),
  mkOrder("k10", "#0028", 3, "Mercado Família Silva", 2, "Larissa Fernandes", "LF",
    [{ name: "Linguiça Toscana", qty: 20, price: 22.80 }, { name: "Presunto Coz. Fat.", qty: 8, price: 31.00 }],
    "Urgente", "em_rota", "2025-07-26 06:45", "Entrega antes das 9h. Acordo com cliente.", "R. das Acácias, 88 — Petrolina, PE",
    [{ status: "novo", time: "2025-07-26 06:45", by: "Larissa Fernandes" }, { status: "analise", time: "2025-07-26 07:00", by: "Admin Central" }, { status: "aprovado", time: "2025-07-26 07:15", by: "Admin Central" }, { status: "separacao", time: "2025-07-26 07:40", by: "Admin Central" }, { status: "em_rota", time: "2025-07-26 08:00", by: "Admin Central" }]),
  mkOrder("k11", "#0025", 1, "Supermercado Bom Preço Ltda", 1, "Vinicius Eudes", "VE",
    [{ name: "Frango Inteiro Cong.", qty: 50, price: 18.90 }, { name: "Peito de Frango S/O", qty: 20, price: 24.50 }],
    "Normal", "entregue", "2025-07-24 09:00", "Entrega recorrente quinzenal.", "Av. Souza Filho, 320 — Petrolina, PE",
    [{ status: "novo", time: "2025-07-24 09:00", by: "Vinicius Eudes" }, { status: "analise", time: "2025-07-24 09:30", by: "Admin Central" }, { status: "aprovado", time: "2025-07-24 10:00", by: "Admin Central" }, { status: "separacao", time: "2025-07-24 11:00", by: "Admin Central" }, { status: "em_rota", time: "2025-07-24 13:00", by: "Admin Central" }, { status: "entregue", time: "2025-07-24 15:20", by: "Vinicius Eudes", note: "Entregue. Recebido pelo gerente Sr. Paulo." }]),
  mkOrder("k12", "#0023", 6, "Restaurante Sabor do Sertão", 4, "Valgustan Junior", "VJ",
    [{ name: "Frango Inteiro Cong.", qty: 15, price: 18.90 }, { name: "Salsicha Hot Dog", qty: 10, price: 14.20 }],
    "Normal", "entregue", "2025-07-23 08:00", "", "Pç. da Bandeira, 12 — Juazeiro, BA",
    [{ status: "novo", time: "2025-07-23 08:00", by: "Valgustan Junior" }, { status: "analise", time: "2025-07-23 08:30", by: "Admin Central" }, { status: "aprovado", time: "2025-07-23 09:00", by: "Admin Central" }, { status: "separacao", time: "2025-07-23 10:00", by: "Admin Central" }, { status: "em_rota", time: "2025-07-23 12:00", by: "Admin Central" }, { status: "entregue", time: "2025-07-23 14:00", by: "Valgustan Junior" }]),
  mkOrder("k13", "#0040", 5, "Lanchonete do Zé", 3, "Tamires Gomes", "TG",
    [{ name: "Presunto Coz. Fat.", qty: 3, price: 31.00 }],
    "Normal", "cancelado", "2025-07-30 07:00", "", "R. Cel. Borges, 50 — Ouricuri, PE",
    [{ status: "novo", time: "2025-07-30 07:00", by: "Tamires Gomes" }, { status: "analise", time: "2025-07-30 07:30", by: "Admin Central" }, { status: "cancelado", time: "2025-07-30 07:45", by: "Admin Central", note: "Produto sem estoque. Cliente avisado." }]),
];
