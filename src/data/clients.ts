import type { Client } from "@/types";

export const clients: Client[] = [
  { id: 1, name: "Supermercado Bom Preço Ltda", doc: "12.345.678/0001-99", phone: "(87) 98765-4321", email: "compras@bompreco.com.br", city: "Petrolina, PE", status: "Ativo" },
  { id: 2, name: "Distribuidora Vale do São Francisco", doc: "98.765.432/0001-11", phone: "(87) 97654-3210", email: "pedidos@valesf.com.br", city: "Petrolina, PE", status: "Ativo" },
  { id: 3, name: "Mercado Família Silva", doc: "456.789.123-00", phone: "(87) 96543-2109", email: "familia.silva@gmail.com", city: "Petrolina, PE", status: "Ativo" },
  { id: 4, name: "Açougue Premium Carnes", doc: "34.567.890/0001-22", phone: "(87) 95432-1098", email: "compras@premiumcarnes.com.br", city: "Ouricuri, PE", status: "Inativo" },
  { id: 5, name: "Lanchonete do Zé", doc: "123.456.789-55", phone: "(87) 94321-0987", email: "ze.lanche@hotmail.com", city: "Ouricuri, PE", status: "Ativo" },
  { id: 6, name: "Restaurante Sabor do Sertão", doc: "67.890.123/0001-44", phone: "(74) 93210-9876", email: "contato@sabordosertao.com.br", city: "Juazeiro, BA", status: "Ativo" },
  { id: 7, name: "Mini Mercado Central", doc: "789.012.345-66", phone: "(74) 92109-8765", email: "minimercado@central.com", city: "Juazeiro, BA", status: "Inativo" },
];
