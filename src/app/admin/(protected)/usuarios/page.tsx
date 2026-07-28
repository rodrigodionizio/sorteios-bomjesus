import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ConviteForm } from "./convite-form";
import { AdminRowActions } from "./admin-row-actions";
import { CancelarConviteButton } from "./cancelar-convite-button";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: meuPerfil }, { data: admins }, { data: convites }] = await Promise.all([
    user
      ? supabase.from("perfis").select("role").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("perfis")
      .select("*")
      .in("role", ["admin", "superadmin"])
      .order("created_at"),
    supabase
      .from("convites")
      .select("*")
      .is("aceito_em", null)
      .order("created_at", { ascending: false }),
  ]);

  const souSuperadmin = meuPerfil?.role === "superadmin";

  return (
    <>
      <AdminPageHeader breadcrumb="Cadastros / Usuários" title="Usuários" />

      <section className="mb-4.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Administradores</h2>
        <p className="mb-4.5 text-[13.5px] text-muted-foreground">
          {souSuperadmin
            ? "Papel controla o que a pessoa pode fazer no sistema — só superadmin pode trocar."
            : "Papel controla o que a pessoa pode fazer no sistema."}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Nome</th>
                <th className="px-3 py-2.5">E-mail</th>
                <th className="px-3 py-2.5">Papel</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {(admins ?? []).map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-bold">
                    {a.display_name ?? a.nome ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{a.email}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        a.role === "superadmin"
                          ? "rounded-full bg-dourado px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#3a1400]"
                          : "rounded-full bg-bege px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-vinho-deep"
                      }
                    >
                      {a.role === "superadmin" ? "👑 Superadmin" : "Admin"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <AdminRowActions
                      perfilId={a.id}
                      role={a.role as "admin" | "superadmin"}
                      souSuperadmin={souSuperadmin}
                      ehVoceMesmo={a.id === user?.id}
                    />
                  </td>
                </tr>
              ))}
              {(admins ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhum administrador cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-4.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Convites pendentes</h2>
        <p className="mb-4.5 text-[13.5px] text-muted-foreground">
          A pessoa ganha acesso automaticamente ao criar a própria conta
          (Google ou e-mail/senha) usando o e-mail convidado.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Nome</th>
                <th className="px-3 py-2.5">E-mail</th>
                <th className="px-3 py-2.5">Convidado em</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {(convites ?? []).map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-bold">{c.nome ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.email}</td>
                  <td className="px-3 py-2.5">{formatDate(c.created_at)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <CancelarConviteButton conviteId={c.id} />
                  </td>
                </tr>
              ))}
              {(convites ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhum convite pendente.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Convidar administrador</h2>
        <p className="mb-4.5 text-[13.5px] text-muted-foreground">
          A pessoa entra depois com Google ou cria uma senha usando esse
          e-mail — o acesso é liberado sozinho, com papel &quot;admin&quot;.
        </p>
        <ConviteForm />
      </section>
    </>
  );
}
