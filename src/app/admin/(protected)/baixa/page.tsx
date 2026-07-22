import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatInt } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SorteioSwitcher } from "@/components/admin/sorteio-switcher";
import { VendorPicker } from "@/components/admin/vendor-picker";
import { LoteCard } from "./lote-card";

export default async function BaixaPage({
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

  const loteIds = (lotes ?? []).map((l) => l.id);
  const { data: baixas } =
    loteIds.length > 0
      ? await supabase
          .from("baixas_cartelas")
          .select("*")
          .in("lote_id", loteIds)
          .order("numero_inicial")
      : { data: [] };

  const totalReservado = (lotes ?? []).reduce((s, l) => s + l.quantidade, 0);
  const totalConfirmado = (baixas ?? []).reduce((s, b) => s + b.quantidade, 0);

  return (
    <>
      <AdminPageHeader
        breadcrumb="Cartelas / Dar baixa"
        title="Dar baixa"
        right={<SorteioSwitcher sorteios={sorteios} currentId={atual?.id ?? null} />}
      />

      {!atual ? (
        <p className="text-muted-foreground">Nenhum sorteio ativo.</p>
      ) : (vendedores ?? []).length === 0 ? (
        <p className="text-muted-foreground">Nenhum vendedor cadastrado ainda.</p>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-[17px] font-black">Confirmar vendas</h2>
          <p className="mb-4.5 max-w-[58ch] text-[13.5px] text-muted-foreground">
            Escolha o vendedor e registre o que ele já prestou contas — pode
            ser o lote inteiro de uma vez ou só parte dele.
          </p>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <VendorPicker vendedores={vendedores ?? []} currentId={vendedorId} />
            <div className="flex gap-2.5">
              <Chip label="Reservadas" value={formatInt(totalReservado)} />
              <Chip label="Confirmadas" value={formatInt(totalConfirmado)} gold />
              <Chip label="Pendentes" value={formatInt(totalReservado - totalConfirmado)} />
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            {(lotes ?? []).map((lote) => (
              <LoteCard
                key={lote.id}
                lote={lote}
                baixas={(baixas ?? []).filter((b) => b.lote_id === lote.id)}
              />
            ))}
            {(lotes ?? []).length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">
                Esse vendedor ainda não tem cartelas reservadas neste sorteio.
              </p>
            ) : null}
          </div>
        </section>
      )}
    </>
  );
}

function Chip({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-2 text-right shadow-sm">
      <div className={`text-[17px] font-black tabular-nums ${gold ? "text-dourado-deep" : "text-vinho-deep"}`}>
        {value}
      </div>
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
