import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatDate, formatInt } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SorteioSwitcher } from "@/components/admin/sorteio-switcher";
import { VendorPicker } from "@/components/admin/vendor-picker";
import { ReservaForm } from "./reserva-form";
import { EditLoteDialog } from "./edit-lote-dialog";

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ vendedor?: string }>;
}) {
  const { vendedor } = await searchParams;
  const supabase = await createClient();
  const { sorteios, atual } = await getSorteioAtual();

  const { data: vendedores } = await supabase
    .from("vendedores")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  const vendedorId = vendedor ?? vendedores?.[0]?.id;

  const { data: lotes } = atual && vendedorId
    ? await supabase
        .from("lotes_cartelas")
        .select("*")
        .eq("sorteio_id", atual.id)
        .eq("vendedor_id", vendedorId)
        .eq("status", "ativo")
        .order("numero_inicial")
    : { data: [] };

  const totalReservado = (lotes ?? []).reduce((s, l) => s + l.quantidade, 0);
  const vendedorAtual = vendedores?.find((v) => v.id === vendedorId);

  return (
    <>
      <AdminPageHeader
        breadcrumb="Cartelas / Reservar"
        title="Reservar cartelas"
        right={<SorteioSwitcher sorteios={sorteios} currentId={atual?.id ?? null} />}
      />

      {!atual ? (
        <p className="text-muted-foreground">
          Cadastre um sorteio antes de reservar cartelas.
        </p>
      ) : (vendedores ?? []).length === 0 ? (
        <p className="text-muted-foreground">
          Cadastre um vendedor antes de reservar cartelas.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-1 text-[17px] font-black">Novo lote</h2>
            <p className="mb-4.5 max-w-[46ch] text-[13.5px] text-muted-foreground">
              Registre o intervalo que o vendedor pegou para vender. Isso
              ainda não é uma venda — é só a reserva.
            </p>

            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Vendedor
              </label>
              <VendorPicker vendedores={vendedores ?? []} currentId={vendedorId} />
            </div>

            {vendedorId ? (
              <ReservaForm key={vendedorId} sorteioId={atual.id} vendedorId={vendedorId} />
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-black">
                Lotes de {vendedorAtual?.nome ?? "—"}
              </h2>
              <span className="text-[12.5px] font-bold text-muted-foreground">
                {formatInt(totalReservado)} cartelas reservadas ao todo
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="px-2.5 py-2">Intervalo</th>
                    <th className="px-2.5 py-2">Qtd</th>
                    <th className="px-2.5 py-2">Tipo</th>
                    <th className="px-2.5 py-2">Reservado em</th>
                    <th className="px-2.5 py-2">Origem</th>
                    <th className="px-2.5 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(lotes ?? []).map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-2.5 py-2 font-bold tabular-nums">
                        {l.numero_inicial === l.numero_final
                          ? l.numero_inicial
                          : `${l.numero_inicial} – ${l.numero_final}`}
                      </td>
                      <td className="px-2.5 py-2 font-bold tabular-nums">{l.quantidade}</td>
                      <td className="px-2.5 py-2">
                        <span className="inline-block rounded-full bg-bege px-2 py-0.5 text-[10.5px] font-bold text-dourado-deep capitalize">
                          {l.tipo}
                        </span>
                      </td>
                      <td className="px-2.5 py-2">{formatDate(l.created_at)}</td>
                      <td className="px-2.5 py-2 capitalize text-muted-foreground">
                        {l.origem}
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <EditLoteDialog
                          loteId={l.id}
                          tipoAtual={l.tipo}
                          numeroInicialAtual={l.numero_inicial}
                          numeroFinalAtual={l.numero_final}
                        />
                      </td>
                    </tr>
                  ))}
                  {(lotes ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2.5 py-6 text-center text-muted-foreground">
                        Nenhum lote reservado ainda.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
