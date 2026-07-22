import type { Metadata } from "next";
import { antennacond, humming } from "@/lib/fonts";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sorteios — Paróquia Senhor Bom Jesus",
  description:
    "Sistema de gestão e acompanhamento de vendas de cartelas de sorteio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${antennacond.variable} ${humming.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
