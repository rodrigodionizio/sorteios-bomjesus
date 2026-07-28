import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Área do vendedor",
  robots: { index: false, follow: false },
};

export default async function VendedorEntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell eyebrow="Paróquia Senhor Bom Jesus" title="Área do vendedor">
      <LoginForm next={next ?? "/vendedor"} />
    </AuthShell>
  );
}
