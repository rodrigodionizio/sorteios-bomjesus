import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VendedorHeader } from "@/components/vendedor/header";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function VendedorProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/vendedor/entrar");
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("display_name, nome, cargo, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil || perfil.role !== "vendedor") {
    redirect("/vendedor/vincular");
  }

  return (
    <div className="min-h-screen bg-background">
      <VendedorHeader
        nome={perfil.display_name ?? perfil.nome ?? "Vendedor(a)"}
        cargo={perfil.cargo}
      />
      <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6">{children}</main>
    </div>
  );
}
