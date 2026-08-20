import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // A importação na mesma pasta

import { AppProvider } from "@/contexts/AppContext";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e4023",
};

export const metadata: Metadata = {
  title: "PNZ Frios",
  description: "Sistema de Gestão e Vendas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PNZ",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-background text-foreground`}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
