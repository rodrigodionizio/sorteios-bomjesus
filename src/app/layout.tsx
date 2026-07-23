import type { Metadata, Viewport } from "next";
import { antennacond, humming } from "@/lib/fonts";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sorteios Bom Jesus — Paróquia Senhor Bom Jesus",
    template: "%s · Sorteios Bom Jesus",
  },
  description:
    "Acompanhe ao vivo o ranking de vendedores do sorteio da Paróquia Senhor Bom Jesus — quantas cartelas cada um já confirmou e quem está mais perto de vencer.",
  applicationName: "Sorteios Bom Jesus",
  authors: [{ name: "Paróquia Senhor Bom Jesus" }],
  keywords: [
    "sorteio",
    "rifa",
    "cartelas",
    "Paróquia Bom Jesus",
    "gestão de sorteio",
    "placar de vendedores",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Sorteios Bom Jesus",
    title: "Sorteios Bom Jesus — Placar ao vivo",
    description:
      "Ranking em tempo real dos vendedores do sorteio da Paróquia Senhor Bom Jesus.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sorteios Bom Jesus — Placar ao vivo",
    description:
      "Ranking em tempo real dos vendedores do sorteio da Paróquia Senhor Bom Jesus.",
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    // favicon.ico é servido via convenção de arquivo (src/app/favicon.ico) —
    // o Next já gera esse <link> sozinho, não precisa repetir aqui.
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sorteios BJ",
  },
};

export const viewport: Viewport = {
  themeColor: "#a41d31",
  colorScheme: "light",
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
        <PwaRegister />
      </body>
    </html>
  );
}
