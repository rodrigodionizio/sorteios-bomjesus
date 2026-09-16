import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { TrophyIcon } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { formatInt } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { rotuloModalidadePublico } from "@/lib/modalidade";
import {
  DESCRICAO_CATEGORIA,
  DESTINATARIO,
  rotuloPremio,
  valorTotal,
  type Premio,
} from "@/lib/premios";
import { RealtimeRefresher } from "@/components/placar/realtime-refresher";
import { ResultadoFinal } from "@/components/placar/resultado-final";
import {
  montarPremiados,
  premiosDasLinhas,
  formatarNumeroCartela,
  type PremiadoPublico,
} from "@/lib/resultado";

/**
 * O placar. Ficava na raiz do site — a raiz agora é a landing, e cada
 * sorteio tem o seu endereço próprio, que é o que permite compartilhar o
 * link de um sorteio específico e indexar cada um com o seu título.
 *
 * `/?sorteio=<id>`, o formato antigo que já circulou em grupo de WhatsApp,
 * é redirecionado para cá pelo `src/proxy.ts`.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ sorteioId: string }> };

async function carregarSorteio(sorteioId: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("sorteios")
    .select("*")
    .eq("id", sorteioId)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { sorteioId } = await params;
  const sorteio = await carregarSorteio(sorteioId);

  if (!sorteio) {
    return { title: "Sorteio não encontrado", robots: { index: false } };
  }

  const encerrado = sorteio.status === "encerrado";
  const titulo = encerrado
    ? `Resultado — ${sorteio.nome}`
    : `Placar ao vivo — ${sorteio.nome}`;
  const descricao = encerrado
    ? `Veja as cartelas sorteadas e os premiados do ${sorteio.nome}, da Paróquia Senhor Bom Jesus.`
    : `Acompanhe o ranking de vendedores do ${sorteio.nome}, da Paróquia Senhor Bom Jesus: quantas cartelas cada um já confirmou e, depois da apuração, o número premiado.`;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/placar/${sorteio.id}` },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: `${SITE_URL}/placar/${sorteio.id}`,
      siteName: "Sorteios Bom Jesus",
      title: titulo,
      description: descricao,
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao },
  };
}

export default async function PlacarPage({ params }: Params) {
  const { sorteioId } = await params;
  const supabase = createPublicClient();

  const sorteio = await carregarSorteio(sorteioId);
  if (!sorteio) notFound();

  if (sorteio.status === "encerrado") {
    return <PaginaResultado sorteio={sorteio} />;
  }

  const [
    { data: sorteios },
    { data: ranking },
    { data: resumoRows },
    { data: linhasPremiados },
  ] = await Promise.all([
    supabase
      .from("sorteios")
      .select("id, nome, status")
      .eq("status", "em_andamento")
      .order("created_at", { ascending: false }),
    supabase
      .from("vw_ranking_vendedores")
      .select(
        "sorteio_id, vendedor_id, nome, total_vendido, total_reservado, ultima_baixa, posicao",
      )
      .eq("sorteio_id", sorteio.id)
      .order("posicao", { ascending: true }),
    supabase.from("vw_resumo_sorteio").select("*").eq("sorteio_id", sorteio.id).limit(1),
    // Premiação e vencedores numa consulta só: a view já filtra os prêmios
    // públicos e resolve quem ganhou cada um (migration 16).
    supabase
      .from("vw_premiados_publico")
      .select("*")
      .eq("sorteio_id", sorteio.id)
      .order("ordem"),
  ]);

  const emAndamento = sorteios ?? [];
  const resumo = resumoRows?.[0];
  const lider = ranking?.[0];
  const resto = ranking?.slice(1) ?? [];
  const top5resto = resto.slice(0, 4);
  const demais = resto.slice(4);
  const linhas = (linhasPremiados ?? []) as PremiadoPublico[];
  const listaPremios = premiosDasLinhas(linhas);
  // Durante a apuração o sorteio ainda está em andamento: os números já
  // sorteados aparecem aqui, acima do ranking.
  const cartelasApuradas = montarPremiados(linhas).filter((p) => p.tipo === "cartela");

  const horaAtualizacao = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  const percentConfirmado = resumo
    ? Math.round(
        (resumo.total_vendidas / Math.max(resumo.total_cartelas_disponiveis, 1)) * 100,
      )
    : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: sorteio.nome,
    description: `${rotuloModalidadePublico(sorteio.modalidade)} da Paróquia Senhor Bom Jesus — ${formatInt(resumo?.total_vendidas ?? 0)} cartelas confirmadas de ${formatInt(resumo?.total_cartelas_disponiveis ?? sorteio.cartela_max - sorteio.cartela_min + 1)}.`,
    ...(sorteio.data_sorteio ? { startDate: sorteio.data_sorteio } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: { "@type": "Organization", name: "Paróquia Senhor Bom Jesus" },
  };

  return (
    <div className="min-h-screen bg-[#fbf3e2] px-4 py-8 text-[#2a0d13] sm:px-8 sm:py-10 lg:px-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RealtimeRefresher sorteioId={sorteio.id} />
      <h2 className="sr-only">
        Placar ao vivo com o ranking de todos os vendedores de cartelas do
        sorteio. O 1º lugar é destacado; os demais aparecem em lista simples
        para acompanhamento. Quando o sorteio já foi apurado, o número da
        cartela premiada e quem a comprou também aparecem aqui.
      </h2>

      <div className="mx-auto max-w-4xl lg:max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/logo-simbolo-cor.svg"
              alt="Sorteios Bom Jesus"
              width={26}
              height={26}
            />
            <span className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Paróquia Senhor Bom Jesus
            </span>
          </Link>
          <div className="flex items-center gap-3.5">
            {sorteio.status === "em_andamento" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-cereja px-3.5 py-1.5 text-[13px] font-black uppercase tracking-wide text-bege">
                <span className="h-2 w-2 animate-pulse rounded-full bg-bege motion-reduce:animate-none" />
                Ao vivo
              </span>
            ) : (
              // Encerrado nunca chega aqui (vai para `PaginaResultado`); o que
              // sobra é o sorteio ainda `planejado`.
              <span className="inline-flex items-center rounded-full bg-bege px-3.5 py-1.5 text-[13px] font-black uppercase tracking-wide text-dourado-deep">
                Em breve
              </span>
            )}
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
                href={`/placar/${s.id}`}
                className={
                  s.id === sorteio.id
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
          <h1 className="text-[36px] font-black leading-[1.03] tracking-tight text-balance sm:text-[52px]">
            Ranking do <span className="text-cereja">{sorteio.nome}</span>
          </h1>
          <p className="mt-2.5 max-w-[60ch] text-[15.5px] text-muted-foreground">
            Acompanhe em tempo real quem está confirmando mais cartelas — a
            lista completa ajuda todo mundo a ver a própria posição.
          </p>

          <PremiacaoResumo premios={listaPremios} />
        </div>

        {cartelasApuradas.length > 0 ? (
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-vinho to-vinho-deep p-5 text-bege shadow-sm sm:p-7">
            <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-bege/70">
              <TrophyIcon className="size-4" />{" "}
              {cartelasApuradas.length > 1 ? "Resultados do sorteio" : "Resultado do sorteio"}
            </div>

            <div className="mt-2 flex flex-col gap-4">
              {cartelasApuradas.map((premio, i) => (
                <div
                  key={premio.chave}
                  className={i > 0 ? "border-t border-bege/15 pt-4" : ""}
                >
                  {premio.tipo === "cartela" && premio.principal ? (
                    <div className="mb-1 text-[10.5px] font-black uppercase tracking-[0.1em] text-dourado">
                      Prêmio principal
                    </div>
                  ) : null}
                  <h2 className="text-[21px] font-black leading-tight sm:text-[25px]">
                    {premio.titulo} —{" "}
                    <span className="text-dourado">
                      nº{" "}
                      {premio.tipo === "cartela"
                        ? formatarNumeroCartela(premio.numero, sorteio.cartela_max)
                        : ""}
                    </span>
                  </h2>
                  <div className="mt-2.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[10.5px] font-bold uppercase tracking-wide text-bege/60">
                        Comprador(a) da cartela
                      </div>
                      <div className="mt-0.5 text-[17px] font-black">
                        {(premio.tipo === "cartela" && premio.comprador) || "Não informado"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10.5px] font-bold uppercase tracking-wide text-bege/60">
                        Vendida por
                      </div>
                      <div className="mt-0.5 text-[17px] font-black">
                        {premio.vendedor ?? "—"}
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
              <div className="bg-card px-5 py-5 sm:px-6">
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
              <div className="bg-card px-5 py-5 sm:px-6">
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
              <div className="bg-card px-5 py-5 sm:px-6">
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
            <div className="border-t border-border bg-secondary px-5 py-4 sm:px-6">
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
          <div className="mb-3 grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-2xl bg-gradient-to-br from-dourado to-[#f2a23f] p-5 text-[#3a1400] shadow-sm sm:grid-cols-[84px_1fr_auto] sm:gap-4.5 sm:p-6">
            <div className="text-center text-[30px] font-black text-[#3a1400]/55 sm:text-[40px]">
              1º
            </div>
            <div className="min-w-0">
              <div className="text-[22px] font-black leading-tight sm:text-[30px]">
                {lider.nome}
              </div>
              <div className="mt-0.5 text-[13px] font-semibold text-[#3a1400]/70">
                Maior vendedor(a) até agora
              </div>
            </div>
            <div className="text-right">
              <div className="text-[30px] font-black sm:text-[40px]">
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
          <Link
            href="/"
            className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
          >
            Todos os sorteios
          </Link>
        </footer>
      </div>
    </div>
  );
}

/**
 * A premiação. Até a migration 14 isto era um parágrafo fixo no código,
 * descrevendo a premiação de 2026 para qualquer sorteio. Agora vem do banco
 * — e, quando o sorteio não tem prêmio cadastrado, não aparece nada, que é
 * melhor do que aparecer a premiação errada.
 */
function PremiacaoResumo({ premios }: { premios: Premio[] }) {
  if (premios.length === 0) return null;

  const paraVendedor = premios.filter((p) => DESTINATARIO[p.categoria] === "vendedor");
  const paraComprador = premios.filter((p) => DESTINATARIO[p.categoria] === "comprador");

  return (
    <div className="mt-4 rounded-xl border border-dourado-deep/25 bg-bege/55 p-4 sm:p-5">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-dourado-deep">
        Premiação deste sorteio
      </div>
      <ul className="flex flex-col gap-2.5">
        {[...paraComprador, ...paraVendedor].map((p) => (
          <li key={p.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {p.principal ? (
              <span className="rounded-full bg-dourado px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#3a1400]">
                Prêmio principal
              </span>
            ) : null}
            <strong className="text-[15.5px] font-black leading-tight">
              {rotuloPremio(p)}
            </strong>
            {valorTotal(p) && p.quantidade > 1 ? (
              <span className="text-[12px] font-bold text-dourado-deep">
                ({valorTotal(p)} no total)
              </span>
            ) : null}
            <span className="text-[13.5px] text-muted-foreground">
              {p.descricao || DESCRICAO_CATEGORIA[p.categoria]}
            </span>
          </li>
        ))}
      </ul>
      {paraVendedor.length > 0 ? (
        <p className="mt-3 border-t border-dourado-deep/20 pt-2.5 text-[12.5px] text-muted-foreground">
          A cartela sorteada pode estar na mão de qualquer um — toda cartela
          confirmada conta e aparece neste ranking.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Sorteio encerrado: só os vencedores.
 *
 * Sem ranking, sem KPI, sem barra de progresso e sem `RealtimeRefresher` —
 * não há mais o que atualizar. O bloco de resultado vinho do placar ao vivo
 * continua existindo, para o intervalo em que algum prêmio já foi apurado
 * mas o sorteio ainda não foi encerrado.
 */
async function PaginaResultado({
  sorteio,
}: {
  sorteio: {
    id: string;
    nome: string;
    data_sorteio: string | null;
    cartela_min: number;
    cartela_max: number;
  };
}) {
  const supabase = createPublicClient();

  // Vencedores resolvidos pelo banco (migration 16). A página só exibe.
  const { data } = await supabase
    .from("vw_premiados_publico")
    .select("*")
    .eq("sorteio_id", sorteio.id)
    .order("ordem");

  const linhas = (data ?? []) as PremiadoPublico[];
  const listaPremios = premiosDasLinhas(linhas);
  const premiados = montarPremiados(linhas);

  return (
    <div className="min-h-screen bg-[#fbf3e2] px-4 py-8 text-[#2a0d13] sm:px-8 sm:py-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/logo-simbolo-cor.svg"
              alt="Sorteios Bom Jesus"
              width={26}
              height={26}
            />
            <span className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Paróquia Senhor Bom Jesus
            </span>
          </Link>
          <span className="inline-flex items-center rounded-full bg-[#efe7d9] px-3.5 py-1.5 text-[13px] font-black uppercase tracking-wide text-[#8a7375]">
            Encerrado
          </span>
        </div>

        <ResultadoFinal sorteio={sorteio} premiados={premiados} premios={listaPremios} />

        <footer className="mt-10 flex flex-wrap justify-between gap-2.5 border-t border-border pt-4.5 text-[12.5px] text-muted-foreground">
          <span>Paróquia Senhor Bom Jesus</span>
          <span className="flex gap-3">
            <Link
              href="/"
              className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
            >
              Ver outros sorteios
            </Link>
            <Link
              href="/verificar"
              className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
            >
              Conferir cartela
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
