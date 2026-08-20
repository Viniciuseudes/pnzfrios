import type { OrderStatus } from "@/types";

// Definimos a ordem lógica de como um pedido avança
export const STATUS_FLOW: OrderStatus[] = [
  "novo",
  "preparando",
  "rota",
  "entregue"
];

// Definimos o visual e as cores de cada coluna do Kanban
export const KANBAN_COLS = [
  { 
    id: "novo", 
    label: "Novos Pedidos", 
    bg: "bg-blue-50", 
    border: "border-blue-200", 
    color: "text-blue-700" 
  },
  { 
    id: "preparando", 
    label: "Em Separação", 
    bg: "bg-amber-50", 
    border: "border-amber-200", 
    color: "text-amber-700" 
  },
  { 
    id: "rota", 
    label: "Em Rota / Entrega", 
    bg: "bg-purple-50", 
    border: "border-purple-200", 
    color: "text-purple-700" 
  },
  { 
    id: "entregue", 
    label: "Finalizados", 
    bg: "bg-emerald-50", 
    border: "border-emerald-200", 
    color: "text-emerald-700" 
  },
];

// Função que calcula qual é o próximo passo do pedido (Ex: novo -> preparando)
export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  if (i !== -1 && i < STATUS_FLOW.length - 1) {
    return STATUS_FLOW[i + 1];
  }
  return null;
}

// Função para pegar as cores de um status específico (usada na tela de pedidos)
export function colFor(s: OrderStatus) {
  return KANBAN_COLS.find((c) => c.id === s);
}

// FUNÇÃO RESTAURADA: Calcula o tempo decorrido para exibição na interface
export function timeAgo(dateString: string | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHrs < 24) return `${diffHrs}h atrás`;
  if (diffDays === 1) return `Ontem`;
  return `${diffDays}d atrás`;
}