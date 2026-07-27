import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatInt } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import { VendedorForm } from "./vendedor-form";
import { AtivoToggle } from "./ativo-toggle";
import { EditVendedorDialog } from "./edit-vendedor-dialog";

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function VendedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { atual } = await getSorteioAtual();

  let query = supabase.from("vendedores").select("*").order("nome");
  if (q) {
    query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`);
  }
  const { data: vendedores } = await query;

  const { data: ranking } = atual
    ? await supabase
        .from("vw_ranking_vendedores")
        .select("*")
        .eq("sorteio_id", atual.id)
    : { data: [] };

  return (
    <>
      <AdminPageHeader breadcrumb="Cadastros / Vendedores" title="Vendedores" />

      <section className="mb-4.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-black">
            {vendedores?.length ?? 0} vendedores cadastrados
          </h2>
          <form className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
            <span>🔍</span>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nome ou telefone"
              className="w-60 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Vendedor</th>
                <th className="px-3 py-2.5">Telefone</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Reservadas</th>
                <th className="px-3 py-2.5">Confirmadas</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {(vendedores ?? []).map((v) => {
                const r = ranking?.find((x) => x.vendedor_id === v.id);
                return (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-bege text-[12.5px] font-black text-vinho-deep">
                          {initials(v.nome)}
                        </span>
                        {v.nome}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-bold tabular-nums">{v.telefone}</td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={v.ativo ? "ativo" : "inativo"} />
                    </td>
                    <td className="px-3 py-2.5 font-bold tabular-nums">
                      {formatInt(r?.total_reservado ?? 0)}
                    </td>
                    <td className="px-3 py-2.5 font-bold tabular-nums">
                      {formatInt(r?.total_vendido ?? 0)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-3">
                        <EditVendedorDialog
                          vendedorId={v.id}
                          nome={v.nome}
                          telefone={v.telefone}
                        />
                        <AtivoToggle vendedorId={v.id} ativo={v.ativo} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(vendedores ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhum vendedor encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Novo vendedor</h2>
        <p className="mb-4.5 text-[13.5px] text-muted-foreground">
          Depois de cadastrado, já aparece disponível para reservar cartelas.
        </p>
        <VendedorForm />
      </section>
    </>
  );
}
