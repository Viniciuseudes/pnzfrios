import type { SalesRoute } from "@/types";

export const initialRoutes: SalesRoute[] = [
  {
    id: 1, name: "Rota Centro — Petrolina", date: "2025-07-28", startTime: "08:00",
    sellerId: 1, sellerName: "Vinicius Eudes", sellerAvatar: "VE",
    status: "Concluída", priority: "Normal",
    notes: "Priorizar clientes com pedido em aberto. Verificar validade dos produtos no estoque dos clientes.",
    stops: [
      { id: 1, clientId: 1, clientName: "Supermercado Bom Preço Ltda", city: "Petrolina, PE", phone: "(87) 98765-4321", order: 1, observation: "Levar proposta de queijo mussarela fatiado", status: "Visitado" },
      { id: 2, clientId: 3, clientName: "Mercado Família Silva", city: "Petrolina, PE", phone: "(87) 96543-2109", order: 2, observation: "Cliente pediu degustação de embutidos", status: "Visitado" },
      { id: 3, clientId: 2, clientName: "Distribuidora Vale do São Francisco", city: "Petrolina, PE", phone: "(87) 97654-3210", order: 3, observation: "", status: "Visitado" },
    ],
  },
  {
    id: 2, name: "Rota Ouricuri + Juazeiro", date: "2025-07-30", startTime: "07:30",
    sellerId: 3, sellerName: "Tamires Gomes", sellerAvatar: "TG",
    status: "Ativa", priority: "Urgente",
    notes: "Levar catálogo atualizado de preços agosto. Negociar prazo de pagamento com Açougue Premium.",
    stops: [
      { id: 4, clientId: 4, clientName: "Açougue Premium Carnes", city: "Ouricuri, PE", phone: "(87) 95432-1098", order: 1, observation: "Reativar cadastro — cliente inativo há 2 meses", status: "Pendente" },
      { id: 5, clientId: 5, clientName: "Lanchonete do Zé", city: "Ouricuri, PE", phone: "(87) 94321-0987", order: 2, observation: "Verificar necessidade de linguiça e frango", status: "Pendente" },
      { id: 6, clientId: 6, clientName: "Restaurante Sabor do Sertão", city: "Juazeiro, BA", phone: "(74) 93210-9876", order: 3, observation: "Apresentar nova linha de queijos", status: "Pendente" },
    ],
  },
  {
    id: 3, name: "Rota Petrolina Norte", date: "2025-08-02", startTime: "09:00",
    sellerId: 2, sellerName: "Larissa Fernandes", sellerAvatar: "LF",
    status: "Rascunho", priority: "Normal",
    notes: "Rota nova — confirmar endereços antes de sair.",
    stops: [
      { id: 7, clientId: 7, clientName: "Mini Mercado Central", city: "Juazeiro, BA", phone: "(74) 92109-8765", order: 1, observation: "Tentativa de reativação", status: "Pendente" },
      { id: 8, clientId: 2, clientName: "Distribuidora Vale do São Francisco", city: "Petrolina, PE", phone: "(87) 97654-3210", order: 2, observation: "Renovar pedido mensal de aves", status: "Pendente" },
    ],
  },
];
