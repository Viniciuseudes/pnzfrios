// Define a ordem lógica do funil de vendas
export const ORDER_STATUSES = [
  "aguardando_pagamento", // <--- A NOVA COLUNA AQUI
  "novo",
  "separacao",
  "rota",
  "entregue",
  "cancelado"
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

// A Matriz Visual que o CicloPedidos.tsx lê para desenhar a tela
export const KANBAN_COLS = [
  {
    id: "aguardando_pagamento",
    label: "Pagamento Pendente",
    bg: "bg-orange-50",
    color: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  {
    id: "novo",
    label: "Novos Pedidos",
    bg: "bg-blue-50",
    color: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  {
    id: "separacao",
    label: "Em Separação",
    bg: "bg-purple-50",
    color: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  {
    id: "rota",
    label: "Em Rota",
    bg: "bg-yellow-50",
    color: "text-yellow-700",
    border: "border-yellow-200",
    dot: "bg-yellow-500",
  },
  {
    id: "entregue",
    label: "Entregue",
    bg: "bg-emerald-50",
    color: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    id: "cancelado",
    label: "Cancelado",
    bg: "bg-red-50",
    color: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
];

// Função que busca as cores de uma coluna específica
export function colFor(status: string) {
  const col = KANBAN_COLS.find((c) => c.id === status);
  if (col) return col;
  
  return {
    bg: "bg-gray-50",
    color: "text-gray-700",
    border: "border-gray-200",
    dot: "bg-gray-500",
    label: status,
  };
}

// Função que define o próximo passo para o botão "Mover para..."
export function nextStatus(current: string): OrderStatus | null {
  switch (current) {
    case "aguardando_pagamento":
      return "novo"; // O Admin pode forçar o pagamento manualmente
    case "novo":
      return "separacao";
    case "separacao":
      return "rota";
    case "rota":
      return "entregue";
    default:
      return null;
  }
}

// Função de tempo (X horas atrás)
export function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHrs < 24) return `${diffHrs}h atrás`;
  return `${diffDays}d atrás`;
}