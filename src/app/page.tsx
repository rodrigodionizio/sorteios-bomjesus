import Link from "next/link";
import Image from "next/image";
import { TrophyIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatInt } from "@/lib/format";
import { RealtimeRefresher } from "@/components/placar/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function PlacarPage({
  searchParams,
}: {
  searchParams: Promise<{ sorteio?: string }>;
}) {
  const { sorteio: sorteioIdParam } = await searchParams;
  const supabase = await createClient();

  const { data: sorteios } = await supabase
    .from("sorteios")
    .select("*")
    .order("created_at", { ascending: false });

  const emAndamento = (sorteios ?? []).filter((s) => s.status === "em_andamento");

  const sorteio =
    (sorteioIdParam ? sorteios?.find((s) => s.id === sorteioIdParam) : undefined) ??
    emAndamento[0] ??
    sorteios?.[0];

  if (!sorteio) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#fbf3e2] px-6 text-center text-[#2a0d13]">
        <Image
          src="/brand/logo-simbolo-cor.svg"
          alt="Sorteios Bom Jesus"
          width={48}
          height={48}
        />
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Paróquia Senhor Bom Jesus
          </p>
          <p className="mt-2 text-lg font-semibold">
            Nenhum sorteio cadastrado no momento.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Assim que um sorteio for criado no painel, o placar aparece aqui
            automaticamente.
          </p>
        </div>
        <Link
          href="/admin"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-cereja px-5 py-2.5 text-sm font-extrabold text-bege hover:bg-[var(--brand-vinho-deep)]"
        >
          Entrar no painel administrativo
        </Link>
      </div>
    );
  }

  const [{ data: ranking }, { data: resumoRows }, { data: resultado }] = await Promise.all([
    supabase
      .from("vw_ranking_vendedores")
      .select("sorteio_id, vendedor_id, nome, total_vendido, total_reservado, ultima_baixa, posicao")
      .eq("sorteio_id", sorteio.id)
      .order("posicao", { ascending: true }),
    supabase
      .from("vw_resumo_sorteio")
      .select("*")
      .eq("sorteio_id", sorteio.id)
      .limit(1),
    // Uma linha por prêmio desde schema-v13. `.maybeSingle()` aqui dava erro
    // assim que o 2º prêmio fosse apurado.
    supabase
      .from("vw_resultado_publico")
      .select("*")
      .eq("sorteio_id", sorteio.id)
      .order("ordem"),
  ]);

  const resumo = resumoRows?.[0];
  const lider = ranking?.[0];
  const resto = ranking?.slice(1) ?? [];
  const top5resto = resto.slice(0, 4);
  const demais = resto.slice(4);

  const horaAtualizacao = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  const percentConfirmado = resumo
    ? Math.round(
        (resumo.total_vendidas / Math.max(resumo.total_cartelas_disponiveis, 1)) *
          100,
      )
    : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: sorteio.nome,
    description: `Sorteio de cartelas da Paróquia Senhor Bom Jesus — ${formatInt(resumo?.total_vendidas ?? 0)} cartelas confirmadas de ${formatInt(resumo?.total_cartelas_disponiveis ?? sorteio.cartela_max - sorteio.cartela_min + 1)}.`,
    ...(sorteio.data_sorteio ? { startDate: sorteio.data_sorteio } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: {
      "@type": "Organization",
      name: "Paróquia Senhor Bom Jesus",
    },
  };

  return (
    <div className="min-h-screen bg-[#fbf3e2] px-4 py-10 text-[#2a0d13] sm:px-8 lg:px-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RealtimeRefresher sorteioId={sorteio.id} />
      <h2 className="sr-only">
        Placar ao vivo com o ranking de todos os vendedores de cartelas do
        sorteio, atualizado em tempo real. O 1º lugar é destacado; os demais
        aparecem em lista simples para acompanhamento. Quando o sorteio já
        foi apurado, o número da cartela premiada e quem a comprou também
        aparecem aqui.
      </h2>

      <div className="mx-auto max-w-4xl lg:max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/logo-simbolo-cor.svg"
              alt=""
              width={26}
              height={26}
            />
            <span className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Paróquia Senhor Bom Jesus
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-cereja px-3.5 py-1.5 text-[13px] font-black uppercase tracking-wide text-bege">
              <span className="h-2 w-2 animate-pulse rounded-full bg-bege motion-reduce:animate-none" />
              Ao vivo
            </span>
          </div>
        </div>

        {emAndamento.length > 1 ? (
          <div className="mb-7 flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="font-bold text-muted-foreground">
              Mais de um sorteio em andamento agora:
            </span>
            {emAndamento.map((s) => (
              <Link
                key={s.id}
                href={s.id === sorteio?.id ? "/" : `/?sorteio=${s.id}`}
                className={
                  s.id === sorteio?.id
                    ? "rounded-full bg-dourado px-3 py-1 font-black text-[#3a1400]"
                    : "rounded-full border border-border bg-card px-3 py-1 font-bold text-muted-foreground hover:border-vinho/40"
                }
              >
                {s.nome}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mb-9">
          <p className="mb-0.5 font-humming text-[26px] text-dourado-deep">
            quem vai levar a cartela premiada?
          </p>
          <h1 className="text-[40px] font-black leading-[1.03] tracking-tight text-balance sm:text-[52px]">
            Ranking do <span className="text-cereja">{sorteio.nome}</span>
          </h1>
          <p className="mt-2.5 max-w-[60ch] text-[15.5px] text-muted-foreground">
            Acompanhe em tempo real quem está confirmando mais cartelas — a
            lista completa ajuda todo mundo a ver a própria posição.
          </p>
          <p className="mt-3 max-w-[58ch] border-l-2 border-dourado-deep pl-3 text-[13px] text-muted-foreground">
            Prêmios para <strong className="text-foreground">o(a) maior vendedor(a)</strong>{" "}
            geral e para <strong className="text-foreground">quem vender a cartela sorteada</strong> —
            e ela pode estar na mão de qualquer um. Toda cartela confirmada
            conta e aparece aqui.
          </p>
        </div>

        {(resultado ?? []).length > 0 ? (
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-vinho to-vinho-deep p-6 text-bege shadow-sm sm:p-7">
            <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-bege/70">
              <TrophyIcon className="size-4" />{" "}
              {(resultado ?? []).length > 1 ? "Resultados do sorteio" : "Resultado do sorteio"}
            </div>

            <div className="mt-2 flex flex-col gap-4">
              {(resultado ?? []).map((premio, i) => (
                <div
                  key={premio.ordem}
                  className={i > 0 ? "border-t border-bege/15 pt-4" : ""}
                >
                  <h2 className="text-[21px] font-black leading-tight sm:text-[25px]">
                    {(resultado ?? []).length > 1 ? `${premio.ordem}º prêmio — ` : "A cartela premiada foi a "}
                    <span className="text-dourado">nº {premio.numero_sorteado}</span>
                  </h2>
                  <div className="mt-2.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[10.5px] font-bold uppercase tracking-wide text-bege/60">
                        Comprador(a) da cartela
                      </div>
                      <div className="mt-0.5 text-[17px] font-black">
                        {premio.nome_comprador ?? "Não informado"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10.5px] font-bold uppercase tracking-wide text-bege/60">
                        Vendida por
                      </div>
                      <div className="mt-0.5 text-[17px] font-black">
                        {premio.vendedor_premiado_nome ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {resumo ? (
          <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
              <div className="bg-card px-6 py-5">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Cartelas confirmadas
                </div>
                <div className="text-[34px] font-black leading-none text-dourado-deep">
                  {formatInt(resumo.total_vendidas)}
                </div>
                <div className="mt-1.5 text-[13px] text-muted-foreground">
                  baixas registradas
                </div>
              </div>
              <div className="bg-card px-6 py-5">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Ainda reservadas
                </div>
                <div className="text-[34px] font-black leading-none text-vinho-deep">
                  {formatInt(resumo.total_reservadas)}
                </div>
                <div className="mt-1.5 text-[13px] text-muted-foreground">
                  com os vendedores, aguardando baixa
                </div>
              </div>
              <div className="bg-card px-6 py-5">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Total do sorteio
                </div>
                <div className="text-[34px] font-black leading-none text-vinho-deep">
                  {formatInt(resumo.total_cartelas_disponiveis)}
                </div>
                <div className="mt-1.5 text-[13px] text-muted-foreground">
                  cartelas numeradas neste sorteio
                </div>
              </div>
            </div>
            <div className="border-t border-border bg-secondary px-6 py-4">
              <div className="mb-2 flex justify-between text-[12.5px] font-bold text-muted-foreground">
                <span>Progresso confirmado</span>
                <strong className="text-dourado-deep">
                  {percentConfirmado}% do sorteio
                </strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-cereja to-dourado"
                  style={{ width: `${percentConfirmado}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {lider ? (
          <div className="mb-3 grid grid-cols-[84px_1fr_auto] items-center gap-4.5 rounded-2xl bg-gradient-to-br from-dourado to-[#f2a23f] p-6 text-[#3a1400] shadow-sm">
            <div className="text-center text-[40px] font-black text-[#3a1400]/55">
              1º
            </div>
            <div>
              <div className="text-[30px] font-black">{lider.nome}</div>
              <div className="mt-0.5 text-[13px] font-semibold text-[#3a1400]/70">
                Maior vendedor(a) até agora
              </div>
            </div>
            <div className="text-right">
              <div className="text-[40px] font-black">
                {formatInt(lider.total_vendido)}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-[#3a1400]/70">
                de {formatInt(lider.total_reservado)} reservadas
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Ninguém confirmou vendas ainda neste sorteio.
          </p>
        )}

        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-10">
          {top5resto.length > 0 ? (
            <div>
              <div className="mb-1 mt-8 flex items-baseline justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Do 2º ao {top5resto.length + 1}º lugar
                </span>
                <small className="text-xs text-muted-foreground">top 5</small>
              </div>
              <div className="flex flex-col">
                {top5resto.map((v) => (
                  <div
                    key={v.vendedor_id}
                    className="grid grid-cols-[34px_1fr_auto] items-center gap-3.5 border-b border-border px-1 py-2.5 last:border-none"
                  >
                    <div className="text-center text-sm font-bold text-muted-foreground">
                      {v.posicao}º
                    </div>
                    <div className="text-[15px] font-bold">
                      {v.nome}
                      <span className="ml-2 rounded-full border border-dourado-deep/45 px-1.5 py-0.5 align-middle text-[9.5px] font-bold uppercase tracking-wide text-dourado-deep">
                        Top 5
                      </span>
                    </div>
                    <div className="text-right text-[15px] font-bold">
                      {formatInt(v.total_vendido)}
                      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                        de {formatInt(v.total_reservado)} reservadas
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {demais.length > 0 ? (
            <div>
              <div className="mb-1 mt-8 flex items-baseline justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Demais vendedores
                </span>
                <small className="text-xs text-muted-foreground">
                  continue vendendo para subir
                </small>
              </div>
              <div className="flex flex-col">
                {demais.map((v) => (
                  <div
                    key={v.vendedor_id}
                    className="grid grid-cols-[34px_1fr_auto] items-center gap-3.5 border-b border-border px-1 py-2.5 last:border-none"
                  >
                    <div className="text-center text-sm font-bold text-muted-foreground">
                      {v.posicao}º
                    </div>
                    <div className="text-[15px] font-bold">{v.nome}</div>
                    <div className="text-right text-[15px] font-bold">
                      {formatInt(v.total_vendido)}
                      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                        de {formatInt(v.total_reservado)} reservadas
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="mt-10 flex flex-wrap justify-between gap-2.5 border-t border-border pt-4.5 text-[12.5px] text-muted-foreground">
          <span>
            Última atualização às{" "}
            <strong className="text-foreground">{horaAtualizacao}</strong>
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
          <Link href="/admin" className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground">
            Área administrativa
          </Link>
        </footer>
      </div>
    </div>
  );
}
