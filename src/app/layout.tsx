import type { Metadata } from "next";
import "@/styles/index.css";
import { AppProvider } from "@/contexts/AppContext";

export const metadata: Metadata = {
  title: "PNZ Frios",
  description: "Sistema de Gestão PNZ Frios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
