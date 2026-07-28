import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { CadastroForm } from "./cadastro-form";

export const metadata: Metadata = {
  title: "Vincular conta — Área do vendedor",
  robots: { index: false, follow: false },
};

export default function VendedorCadastroPage() {
  return (
    <AuthShell eyebrow="Paróquia Senhor Bom Jesus" title="Vincular minha conta">
      <CadastroForm />
    </AuthShell>
  );
}
