import { createClient } from "@/lib/supabase/server";
import { PerfilForm } from "@/components/perfil/perfil-form";

export default async function VendedorContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = user
    ? await supabase
        .from("perfis")
        .select("display_name, cargo, email")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <>
      <h1 className="mb-1 text-2xl font-black">Minha conta</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Personalize como seu nome aparece no sistema.
      </p>

      <section className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4.5 rounded-lg bg-secondary px-3.5 py-2.5 text-[13px] text-muted-foreground">
          {perfil?.email ?? user?.email}
        </div>
        <PerfilForm
          displayName={perfil?.display_name ?? null}
          cargo={perfil?.cargo ?? null}
        />
      </section>
    </>
  );
}
