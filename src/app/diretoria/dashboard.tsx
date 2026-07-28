import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { formatInt, formatBRL } from "@/lib/format";
import { RealtimeRefresher } from "@/components/placar/realtime-refresher";

type Sorteio = {
  id: string;
  nome: string;
  data_sorteio: string | null;
};

export async function Dashboard({ sorteio }: { sorteio: Sorteio }) {
  const supabase = await createClient();

  const [{ data: resumoRows }, { data: ranking }, { data: diario }] = await Promise.all([
    supabase.from("vw_resumo_sorteio").select("*").eq("sorteio_id", sorteio.id).limit(1),
    supabase
      .from("vw_ranking_vendedores")
      .select("vendedor_id, nome, total_vendido")
      .eq("sorteio_id", sorteio.id)
      .order("posicao", { ascending: true })
      .limit(5),
    supabase
      .from("vw_arrecadacao_diaria")
      .select("*")
      .eq("sorteio_id", sorteio.id)
      .order("dia", { ascending: false })
      .limit(12),
  ]);

  const resumo = resumoRows?.[0];
  const diarioAsc = (diario ?? []).slice().reverse();

  const totalDisponiveis = resumo
    ? Math.max(
        resumo.total_cartelas_disponiveis - resumo.total_reservadas - resumo.total_vendidas,
        0,
      )
    : 0;
  const pctConfirmado = resumo
    ? Math.round((resumo.total_vendidas / Math.max(resumo.total_cartelas_disponiveis, 1)) * 100)
    : 0;
  const pctReservado = resumo
    ? Math.round((resumo.total_reservadas / Math.max(resumo.total_cartelas_disponiveis, 1)) * 100)
    : 0;
  const pctDisponivel = Math.max(100 - pctConfirmado - pctReservado, 0);

  const maxDiario = Math.max(1, ...diarioAsc.map((d) => Number(d.valor_dia)));
  const hojeStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(
    new Date(),
  );
  const valorHoje = diarioAsc.find((d) => d.dia === hojeStr)?.valor_dia ?? 0;

  const horaAtualizacao = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  const maxRanking = Math.max(1, ranking?.[0]?.total_vendido ?? 0);

  return (
    <div className="min-h-screen bg-[#fbf3e2] text-[#2a0d13]">
      <RealtimeRefresher sorteioId={sorteio.id} />
      <h2 className="sr-only">
        Painel restrito para diretoria e tesouraria: total arrecadado, cartelas
        vendidas, progresso do sorteio, arrecadação por dia e ranking de
        vendedores, atualizado automaticamente.
      </h2>

      <div className="mx-auto max-w-[1080px] px-5 py-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/logo-simbolo-cor.svg" alt="" width={34} height={34} />
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                Paróquia Senhor Bom Jesus
              </div>
              <h1 className="text-[19px] font-black">{sorteio.nome}</h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-vinho px-3.5 py-1.5 text-[11.5px] font-black uppercase tracking-wide text-bege">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bege motion-reduce:animate-none" />
            Atualiza automaticamente
          </span>
        </div>

        <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="rounded-[20px] border border-border bg-card p-6 shadow-sm">
            <div className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              Total arrecadado
            </div>
            <div className="mt-1.5 text-[clamp(30px,5vw,44px)] font-black leading-none text-dourado-deep">
              {formatBRL(resumo?.arrecadacao_confirmada ?? 0)}
            </div>
            {Number(valorHoje) > 0 ? (
              <div className="mt-2 text-[12.5px] text-muted-foreground">
                <strong className="font-extrabold text-good">
                  +{formatBRL(Number(valorHoje))}
                </strong>{" "}
                confirmados hoje
              </div>
            ) : null}
          </div>
          <div className="rounded-[20px] border border-border bg-card p-6 shadow-sm">
            <div className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              Cartelas vendidas
            </div>
            <div className="mt-1.5 text-[clamp(30px,5vw,44px)] font-black leading-none text-vinho-deep">
              {formatInt(resumo?.total_vendidas ?? 0)}
            </div>
            <div className="mt-2 text-[12.5px] text-muted-foreground">
              de {formatInt(resumo?.total_cartelas_disponiveis ?? 0)} ·{" "}
              <strong className="font-extrabold text-foreground">{pctConfirmado}%</strong> do
              total
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MiniKpi label="reservadas" value={formatInt(resumo?.total_reservadas ?? 0)} />
          <MiniKpi label="disponíveis" value={formatInt(totalDisponiveis)} />
          <MiniKpi label="vendedores" value={formatInt(ranking?.length ?? 0)} />
          <MiniKpi
            label="confirmadas"
            value={`${pctConfirmado}%`}
          />
        </div>

        <section className="mb-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-[15.5px] font-black">Progresso do sorteio</h2>
          <p className="mb-4.5 text-[12.5px] text-muted-foreground">
            {formatInt(resumo?.total_cartelas_disponiveis ?? 0)} cartelas ao todo —
            confirmadas, reservadas e ainda disponíveis.
          </p>
          <div className="flex h-[22px] overflow-hidden rounded-full bg-secondary">
            <span className="h-full bg-dourado-deep" style={{ width: `${pctConfirmado}%` }} />
            <span className="h-full bg-vinho" style={{ width: `${pctReservado}%` }} />
          </div>
          <div className="mt-3.5 flex flex-wrap gap-4.5">
            <LegendItem colorClass="bg-dourado-deep" label="Confirmadas" value={`${formatInt(resumo?.total_vendidas ?? 0)} (${pctConfirmado}%)`} />
            <LegendItem colorClass="bg-vinho" label="Reservadas" value={`${formatInt(resumo?.total_reservadas ?? 0)} (${pctReservado}%)`} />
            <LegendItem colorClass="bg-secondary border border-border" label="Disponíveis" value={`${formatInt(totalDisponiveis)} (${pctDisponivel}%)`} />
          </div>
        </section>

        <section className="mb-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-[15.5px] font-black">Arrecadação por dia</h2>
          <p className="mb-4.5 text-[12.5px] text-muted-foreground">
            Passe o mouse em cada barra para ver o valor exato.
          </p>
          {diarioAsc.length > 0 ? (
            <div className="flex h-[130px] items-end gap-1.5">
              {diarioAsc.map((d) => {
                const pct = Math.round((Number(d.valor_dia) / maxDiario) * 100);
                const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "America/Fortaleza",
                }).format(new Date(`${d.dia}T12:00:00`));
                return (
                  <div key={d.dia} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                    <div className="pointer-events-none absolute bottom-full mb-1.5 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[11.5px] font-bold text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                      {dataFormatada} — {formatBRL(Number(d.valor_dia))}
                    </div>
                    <div
                      className="w-full max-w-[30px] rounded-t-[4px] bg-dourado transition-[filter] group-hover:brightness-90"
                      style={{ height: `${Math.max(pct, 3)}%` }}
                    />
                    <div className="mt-1.5 text-[10px] font-bold text-muted-foreground">
                      {dataFormatada.split(" ")[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma baixa confirmada ainda.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-[15.5px] font-black">Top vendedores</h2>
          <p className="mb-4.5 text-[12.5px] text-muted-foreground">
            Quem mais confirmou cartelas até agora.
          </p>
          <div className="flex flex-col">
            {(ranking ?? []).map((v, i) => (
              <div
                key={v.vendedor_id}
                className="flex items-center gap-3 border-b border-border py-2.5 last:border-none"
              >
                <span className="w-[22px] text-center text-[12.5px] font-black text-muted-foreground">
                  {i + 1}º
                </span>
                <span className="flex-1 text-[13.5px] font-bold">{v.nome}</span>
                <span className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-secondary">
                  <span
                    className="block h-full rounded-full bg-dourado-deep"
                    style={{ width: `${Math.round((v.total_vendido / maxRanking) * 100)}%` }}
                  />
                </span>
                <span className="w-11 text-right text-[13px] font-black tabular-nums">
                  {formatInt(v.total_vendido)}
                </span>
              </div>
            ))}
            {(ranking ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Ninguém confirmou vendas ainda.
              </p>
            ) : null}
          </div>
        </section>

        <footer className="mt-3.5 flex flex-wrap justify-between gap-2 text-[12px] text-muted-foreground">
          <span>
            Última atualização às <strong className="text-foreground">{horaAtualizacao}</strong>
          </span>
          {sorteio.data_sorteio ? (
            <span>
              Sorteio previsto para{" "}
              <strong className="text-foreground">
                {new Intl.DateTimeFormat("pt-BR").format(
                  new Date(`${sorteio.data_sorteio}T00:00:00`),
                )}
              </strong>
            </span>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="text-[21px] font-black">{value}</div>
      <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function LegendItem({
  colorClass,
  label,
  value,
}: {
  colorClass: string;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground">
      <span className={`h-2.5 w-2.5 rounded-[3px] ${colorClass}`} />
      {label} · <b className="text-foreground">{value}</b>
    </span>
  );
}
