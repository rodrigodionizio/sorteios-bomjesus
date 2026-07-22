import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatBRL, formatInt } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SorteioSwitcher } from "@/components/admin/sorteio-switcher";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { sorteios, atual } = await getSorteioAtual();

  const { data: vendedores } = await supabase
    .from("vendedores")
    .select("id, ativo");

  const { data: resumos } = await supabase
    .from("vw_resumo_sorteio")
    .select("*");

  const resumoAtual = resumos?.find((r) => r.sorteio_id === atual?.id);

  const { data: ranking } = atual
    ? await supabase
        .from("vw_ranking_vendedores")
        .select("*")
        .eq("sorteio_id", atual.id)
        .order("posicao", { ascending: true })
        .limit(5)
    : { data: [] };

  const sorteiosAtivos = sorteios.filter(
    (s) => s.status === "em_andamento",
  ).length;
  const vendedoresAtivos = vendedores?.filter((v) => v.ativo).length ?? 0;

  return (
    <>
      <AdminPageHeader
        breadcrumb="Painel"
        title="Visão geral"
        right={
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              className="border-border font-bold"
              render={<Link href="/admin/vendedores" />}
            >
              + Novo vendedor
            </Button>
            <Button
              className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
              render={<Link href="/admin/reservar" />}
            >
              Reservar cartelas
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Sorteios ativos" value={formatInt(sorteiosAtivos)} sub={`de ${sorteios.length} cadastrados`} />
        <KpiCard label="Vendedores ativos" value={formatInt(vendedoresAtivos)} sub={`de ${vendedores?.length ?? 0} cadastrados`} />
        <KpiCard
          label="Cartelas confirmadas"
          value={formatInt(resumoAtual?.total_vendidas ?? 0)}
          sub={
            resumoAtual
              ? `de ${formatInt(resumoAtual.total_cartelas_disponiveis)}`
              : "sem sorteio ativo"
          }
          gold
        />
        <KpiCard
          label="Arrecadação confirmada"
          value={formatBRL(resumoAtual?.arrecadacao_confirmada ?? 0)}
          sub={atual ? atual.nome : "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-[17px] font-black">Sorteios em andamento</h2>
          <p className="mb-4.5 max-w-[56ch] text-[13.5px] text-muted-foreground">
            O sistema acompanha mais de um sorteio ao mesmo tempo.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5">Sorteio</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Confirmado</th>
                  <th className="px-3 py-2.5">Sorteio em</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sorteios.map((s) => {
                  const r = resumos?.find((x) => x.sorteio_id === s.id);
                  const pct = r
                    ? Math.round(
                        (r.total_vendidas /
                          Math.max(r.total_cartelas_disponiveis, 1)) *
                          100,
                      )
                    : 0;
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2.5 font-bold">{s.nome}</td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-dourado"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {s.data_sorteio
                          ? new Intl.DateTimeFormat("pt-BR").format(
                              new Date(`${s.data_sorteio}T00:00:00`),
                            )
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href="/admin/sorteios"
                          className="text-[13px] font-bold text-vinho"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {sorteios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      Nenhum sorteio cadastrado ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-[17px] font-black">Top vendedores</h2>
          <p className="mb-4.5 text-[13.5px] text-muted-foreground">
            {atual ? atual.nome : "Nenhum sorteio selecionado"}
          </p>
          <div className="flex flex-col">
            {ranking && ranking.length > 0 ? (
              ranking.map((v) => (
                <div
                  key={v.vendedor_id}
                  className="grid grid-cols-[26px_1fr_auto] items-center gap-2.5 border-b border-border py-2.5 last:border-none"
                >
                  <span
                    className={`text-center text-[13px] font-black ${v.posicao === 1 ? "text-dourado-deep" : "text-muted-foreground"}`}
                  >
                    {v.posicao}º
                  </span>
                  <span className="text-sm font-bold">{v.nome}</span>
                  <span className="text-right text-[14.5px] font-black text-vinho-deep">
                    {formatInt(v.total_vendido)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                Ainda não há vendas confirmadas.
              </p>
            )}
          </div>
          <div className="mt-3 text-right">
            <Link href="/" target="_blank" className="text-[12.5px] font-bold text-vinho">
              Ver placar completo →
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-4">
        <SorteioSwitcher sorteios={sorteios} currentId={atual?.id ?? null} />
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  sub,
  gold,
}: {
  label: string;
  value: string;
  sub: string;
  gold?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-[30px] font-black leading-none ${gold ? "text-dourado-deep" : "text-vinho-deep"}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[12.5px] text-muted-foreground">{sub}</div>
    </div>
  );
}
