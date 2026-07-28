import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/admin/(protected)/actions";
import { VincularForm } from "./vincular-form";

export const metadata: Metadata = {
  title: "Complete seu cadastro — Área do vendedor",
  robots: { index: false, follow: false },
};

export default async function VendedorVincularPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: perfil } = await supabase
      .from("perfis")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (perfil?.role === "vendedor") {
      redirect("/vendedor");
    }
  }

  return (
    <AuthShell
      eyebrow="Paróquia Senhor Bom Jesus"
      title="Complete seu cadastro"
      footer={
        <form action={logout}>
          <button type="submit" className="font-bold hover:underline">
            Sair e entrar com outra conta
          </button>
        </form>
      }
    >
      <p className="mb-4.5 text-sm text-muted-foreground">
        Sua conta ainda não está vinculada a nenhum cadastro de vendedor.
        Digite o celular e o código de vínculo que a coordenação passou
        para você.
      </p>
      <VincularForm />
    </AuthShell>
  );
}
