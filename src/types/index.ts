export type View = "dashboard" | "pedidos" | "clientes" | "produtos" | "vendedores" | "rotas" | "ciclo";
export type SellerView = "home" | "catalogo" | "venda" | "rotas" | "meta" | "meuspedidos";
export type OrderStatus = "novo" | "analise" | "aprovado" | "separacao" | "em_rota" | "entregue" | "cancelado";
export type UserRole = "gestor" | "vendedor";

export interface OrderHistoryEntry {
  status: OrderStatus;
  time: string;
  by: string;
  note?: string;
}

export interface KanbanOrder {
  id: string;
  orderNumber: string;
  clientId: number;
  clientName: string;
  sellerId: number;
  sellerName: string;
  sellerAvatar: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  priority: "Normal" | "Urgente";
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  notes: string;
  deliveryAddress: string;
  history: OrderHistoryEntry[];
}

export interface Client {
  id: number;
  name: string;
  doc: string;
  phone: string;
  email: string;
  city: string;
  status: "Ativo" | "Inativo";
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  img: string;
}

export interface Seller {
  id: number;
  name: string;
  avatar: string;
  target: number;
  achieved: number;
  orders: number;
  region: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  qty: number;
  price: number;
}

export interface RouteStop {
  id: number;
  clientId: number;
  clientName: string;
  city: string;
  phone: string;
  order: number;
  observation: string;
  status: "Pendente" | "Visitado" | "Não visitado";
}

export interface SalesRoute {
  id: number;
  name: string;
  date: string;
  startTime: string;
  sellerId: number;
  sellerName: string;
  sellerAvatar: string;
  stops: RouteStop[];
  notes: string;
  status: "Rascunho" | "Ativa" | "Concluída";
  priority: "Normal" | "Urgente";
}

export interface Account {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  avatar: string;
  sellerId: number | null;
}
