import type { Account } from "@/types";

export const ACCOUNTS: Account[] = [
  { email: "admin@pnzfrios.com.br",    password: "admin123", role: "gestor",   name: "Admin Central",    avatar: "AC", sellerId: null },
  { email: "vinicius@pnzfrios.com.br", password: "123456",   role: "vendedor", name: "Vinicius Eudes",   avatar: "VE", sellerId: 1 },
  { email: "larissa@pnzfrios.com.br",  password: "123456",   role: "vendedor", name: "Larissa Fernandes", avatar: "LF", sellerId: 2 },
  { email: "tamires@pnzfrios.com.br",  password: "123456",   role: "vendedor", name: "Tamires Gomes",    avatar: "TG", sellerId: 3 },
  { email: "valgustan@pnzfrios.com.br", password: "123456",  role: "vendedor", name: "Valgustan Junior", avatar: "VJ", sellerId: 4 },
];
