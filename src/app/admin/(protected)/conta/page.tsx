import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PerfilForm } from "@/components/perfil/perfil-form";

export default async function AdminContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = user
    ? await supabase
        .from("perfis")
        .select("display_name, cargo, email, role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <>
      <AdminPageHeader breadcrumb="Conta" title="Minha conta" />

      <section className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4.5 flex items-center justify-between gap-3 rounded-lg bg-secondary px-3.5 py-2.5 text-[13px]">
          <span className="text-muted-foreground">{perfil?.email ?? user?.email}</span>
          <span className="rounded-full bg-bege px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-vinho-deep">
            {perfil?.role ?? "admin"}
          </span>
        </div>
        <PerfilForm
          displayName={perfil?.display_name ?? null}
          cargo={perfil?.cargo ?? null}
        />
      </section>
    </>
  );
}
