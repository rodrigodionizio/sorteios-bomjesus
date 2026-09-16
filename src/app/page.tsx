import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, SearchCheckIcon, StoreIcon, KeyRoundIcon } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { formatInt } from "@/lib/format";
import { rotuloModalidadePublico } from "@/lib/modalidade";
import { DESTINATARIO, rotuloPremio, type Premio } from "@/lib/premios";
import {
  formatarNumeroCartela,
  montarPremiados,
  premiosDasLinhas,
  type PremiadoPublico,
} from "@/lib/resultado";
import { FaixaResultado } from "@/components/placar/faixa-resultado";

/**
 * A porta de entrada pública.
 *
 * Até aqui a raiz do site ERA o placar: quem abria caía direto no ranking do
 * primeiro sorteio em andamento e, sem sorteio nenhum, via um aviso de cinco
 * linhas com um botão para o painel — um beco sem saída para quem não é da
 * equipe. O placar agora mora em `/placar/[sorteioId]`.
 *
 * CACHE: esta página é a que aguenta o pico da noite do sorteio, quando o
 * link circula em grupo de WhatsApp. Ela é ISR — regenerada a cada 5 min —
 * e por isso usa `createPublicClient()`, sem cookie. Bastaria um `cookies()`
 * (ou um `searchParams`) para o Next torná-la dinâmica e o `revalidate`
 * perder o efeito. O `/?sorteio=<id>` legado é redirecionado no `proxy.ts`,
 * justamente para não precisar ler searchParams aqui.
 *
 * As Server Actions que mexem na premiação chamam `revalidatePath("/")`, de
 * modo que uma correção de prêmio aparece na hora, sem esperar os 5 min.
 */
export const revalidate = 300;

const DESCRICAO_SITE =
  "Sistema de gestão de sorteios da Paróquia Senhor Bom Jesus: veja os sorteios em andamento, acompanhe o placar ao vivo dos vendedores e confira a autenticidade da sua cartela.";

export const metadata: Metadata = {
  title: "Sorteios da Paróquia Senhor Bom Jesus",
  description: DESCRICAO_SITE,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Sorteios da Paróquia Senhor Bom Jesus",
    description: DESCRICAO_SITE,
    url: "/",
  },
};

export default async function LandingPage() {
  const supabase = createPublicClient();

  const [{ data: sorteios }, { data: resumos }, { data: premiados }] =
    await Promise.all([
      supabase.from("sorteios").select("*").order("created_at", { ascending: false }),
      supabase.from("vw_resumo_sorteio").select("*"),
      // Premiação pública e vencedores já resolvidos pelo banco (migration 16).
      supabase.from("vw_premiados_publico").select("*").order("ordem"),
    ]);

  const todos = sorteios ?? [];
  const emAndamento = todos.filter((s) => s.status === "em_andamento");

  const linhasDe = (sorteioId: string) =>
    ((premiados ?? []) as PremiadoPublico[]).filter((l) => l.sorteio_id === sorteioId);
  const premiosDe = (sorteioId: string): Premio[] => premiosDasLinhas(linhasDe(sorteioId));
  // O cartão de encerrado mostra a cartela do prêmio principal — a view já
  // entrega o principal primeiro.
  const cartelaPrincipal = (sorteioId: string) => {
    const c = montarPremiados(linhasDe(sorteioId)).find((p) => p.tipo === "cartela");
    return c && c.tipo === "cartela"
      ? { numero_sorteado: c.numero, nome_comprador: c.comprador }
      : undefined;
  };

  // O destaque dourado: o encerrado mais recente QUE TENHA APURAÇÃO. Um
  // sorteio encerrado sem resultado registrado não tem o que destacar.
  // `sorteios` já vem do mais novo para o mais antigo.
  const destaque = todos.find(
    (s) => s.status === "encerrado" && linhasDe(s.id).some((l) => l.apurado),
  );
  const faixaResultado = destaque ? (
    <FaixaResultado
      sorteio={destaque}
      premiados={montarPremiados(linhasDe(destaque.id))}
    />
  ) : null;

  // O destacado não se repete na lista de encerrados logo abaixo.
  const encerrados = todos
    .filter((s) => s.status === "encerrado" && s.id !== destaque?.id)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/93 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Marca: o símbolo colorido é a variante indicada para fundo claro.
              A horizontal não entra aqui porque o SVG dela carrega um retângulo
              bege (#FCECCB) que não casa com o fundo da página (#FBF3E2) — ela
              aparece no rodapé, sobre um bloco bege. */}
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/brand/logo-simbolo-cor.svg"
              alt=""
              width={32}
              height={32}
              className="shrink-0"
              priority
            />
            <div className="min-w-0">
              <div className="text-[15px] font-black leading-tight">Sorteios Bom Jesus</div>
              <div className="truncate text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Paróquia Senhor Bom Jesus
              </div>
            </div>
          </div>
          <Link
            href="/admin"
            className="shrink-0 border-b border-[#d8c6ab] text-[12.5px] font-bold text-muted-foreground hover:text-foreground"
          >
            Área da equipe
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
        {emAndamento.length > 0 ? (
          <>
            <section className="pt-8 sm:pt-11">
              <p className="mb-0.5 font-humming text-[25px] text-dourado-deep">
                acompanhe de onde você estiver
              </p>
              <h1 className="text-[32px] font-black leading-[1.04] tracking-tight text-balance sm:text-[48px]">
                Os sorteios da <span className="text-cereja">nossa paróquia</span>,
                abertos para todo mundo ver.
              </h1>
              <p className="mt-3 max-w-[58ch] text-[15.5px] leading-relaxed text-muted-foreground">
                Escolha o sorteio abaixo para ver o placar ao vivo: quantas
                cartelas já foram confirmadas, quem está liderando entre os
                vendedores e, depois da apuração, o número premiado e quem
                levou.
              </p>
            </section>

            <RotuloSecao titulo="Sorteios em andamento" nota="atualizado o tempo todo" />
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {emAndamento.map((s) => (
                <CardSorteio
                  key={s.id}
                  sorteio={s}
                  resumo={resumos?.find((r) => r.sorteio_id === s.id)}
                  premios={premiosDe(s.id)}
                />
              ))}
            </div>

            {faixaResultado ? <div className="mt-3.5">{faixaResultado}</div> : null}

            <RotuloSecao titulo="Serviços rápidos" nota="sem precisar de conta" />
            <Atalhos />

            {encerrados.length > 0 ? (
              <>
                <RotuloSecao
                  titulo="Sorteios encerrados"
                  nota="o resultado continua no ar"
                />
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  {encerrados.map((s) => (
                    <CardEncerrado
                      key={s.id}
                      sorteio={s}
                      premiado={cartelaPrincipal(s.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <>
            {faixaResultado ? <div className="pt-7 sm:pt-9">{faixaResultado}</div> : null}
            <SemSorteioAtivo
              encerrados={encerrados.map((s) => ({ sorteio: s, premiado: cartelaPrincipal(s.id) }))}
            />
          </>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {/* A logo horizontal tem fundo bege embutido no SVG — por isso ela
              vai dentro de um bloco `bg-bege`, onde o retângulo desaparece.
              Abaixo de 200px de largura a identidade manda usar só o símbolo. */}
          <div className="w-fit rounded-lg bg-bege px-1 py-0.5">
            <Image
              src="/brand/logo-horizontal.svg"
              alt="Sorteios Bom Jesus"
              width={200}
              height={60}
            />
          </div>
          <div className="text-[12px] leading-relaxed text-muted-foreground">
            <p>Paróquia Senhor Bom Jesus · sistema próprio de gestão de sorteios</p>
            <p className="mt-1 flex flex-wrap gap-x-3">
              <Link href="/verificar" className="hover:text-foreground">
                Conferir cartela
              </Link>
              <Link href="/vendedor" className="hover:text-foreground">
                Área do vendedor
              </Link>
              <Link href="/admin" className="hover:text-foreground">
                Área da equipe
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function RotuloSecao({ titulo, nota }: { titulo: string; nota: string }) {
  return (
    <div className="mb-3 mt-9 flex items-baseline justify-between gap-3">
      <h2 className="text-[11.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        {titulo}
      </h2>
      <small className="text-[11.5px] text-muted-foreground">{nota}</small>
    </div>
  );
}

type SorteioRow = {
  id: string;
  nome: string;
  descricao: string | null;
  cartela_min: number;
  cartela_max: number;
  data_sorteio: string | null;
  modalidade: "rifa" | "bingo";
};

type ResumoRow = {
  total_cartelas_disponiveis: number;
  total_vendidas: number;
};

function CardSorteio({
  sorteio,
  resumo,
  premios,
}: {
  sorteio: SorteioRow;
  resumo?: ResumoRow;
  premios: Premio[];
}) {
  const pct = resumo
    ? Math.round(
        (resumo.total_vendidas / Math.max(resumo.total_cartelas_disponiveis, 1)) * 100,
      )
    : 0;

  // Os prêmios de vendedor são os que puxam a atenção de quem vende — e eram
  // exatamente os que não existiam no banco até a migration 14.
  const destaque = [...premios]
    .sort(
      (a, b) =>
        Number(DESTINATARIO[b.categoria] === "vendedor") -
        Number(DESTINATARIO[a.categoria] === "vendedor"),
    )
    .slice(0, 3);

  return (
    <Link
      href={`/placar/${sorteio.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-4.5 shadow-sm transition-colors hover:border-vinho/40 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cereja px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide text-bege">
          <span className="size-[7px] animate-pulse rounded-full bg-bege motion-reduce:animate-none" />
          Ao vivo
        </span>
        <span className="rounded-full bg-info-bg px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide text-info">
          {rotuloModalidadePublico(sorteio.modalidade)}
        </span>
      </div>

      <h3 className="mt-2.5 text-[20px] font-black leading-tight">{sorteio.nome}</h3>
      <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
        {sorteio.descricao
          ? `${sorteio.descricao} · `
          : ""}
        cartelas {formatInt(sorteio.cartela_min)} a {formatInt(sorteio.cartela_max)}
      </p>

      {destaque.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {destaque.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-[#efd9a8] bg-bege px-2.5 py-1 text-[11.5px] font-bold text-[#6b4a22]"
            >
              {rotuloPremio(p)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-[#f2e9d6]">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-cereja to-dourado"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[12.5px] text-muted-foreground">
        <span>
          <b className="tabular-nums text-foreground">
            {formatInt(resumo?.total_vendidas ?? 0)}
          </b>{" "}
          confirmadas
        </span>
        <span>
          <b className="tabular-nums text-foreground">{pct}%</b> do total
        </span>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border pt-3 text-[12.5px] text-muted-foreground">
        <span>
          {sorteio.data_sorteio ? (
            <>
              Sorteio em{" "}
              <b className="text-foreground">
                {new Intl.DateTimeFormat("pt-BR").format(
                  new Date(`${sorteio.data_sorteio}T00:00:00`),
                )}
              </b>
            </>
          ) : (
            "Data a definir"
          )}
        </span>
        <span className="inline-flex items-center gap-1 font-black text-cereja">
          Ver placar <ArrowRightIcon className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function CardEncerrado({
  sorteio,
  premiado,
}: {
  sorteio: SorteioRow;
  premiado?: { numero_sorteado: number; nome_comprador: string | null };
}) {
  return (
    <Link
      href={`/placar/${sorteio.id}`}
      className="flex flex-col rounded-2xl border border-border bg-card p-4.5 shadow-sm transition-colors hover:border-vinho/40 sm:p-5"
    >
      <span className="w-fit rounded-full bg-[#efe7d9] px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide text-[#8a7375]">
        Encerrado
      </span>
      <h3 className="mt-2.5 text-[20px] font-black leading-tight">{sorteio.nome}</h3>
      <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
        {premiado ? (
          <>
            {/* O ganhador é quem comprou. Na área pública de um sorteio
                encerrado o destaque é de quem levou o prêmio. */}
            Cartela premiada{" "}
            <b className="text-foreground">
              nº {formatarNumeroCartela(premiado.numero_sorteado, sorteio.cartela_max)}
            </b>
            {premiado.nome_comprador ? ` · ${premiado.nome_comprador}` : ""}
          </>
        ) : (
          "Resultado disponível no placar."
        )}
      </p>
      <span className="mt-3.5 inline-flex items-center gap-1 border-t border-border pt-3 text-[12.5px] font-black text-cereja">
        Ver resultado <ArrowRightIcon className="size-3.5" />
      </span>
    </Link>
  );
}

function Atalhos() {
  const itens = [
    {
      href: "/verificar",
      Icone: SearchCheckIcon,
      titulo: "Conferir uma cartela",
      texto: "Digite o código do carimbo e veja se a cartela é autêntica.",
    },
    {
      href: "/vendedor",
      Icone: StoreIcon,
      titulo: "Sou vendedor(a)",
      texto: "Entre para acompanhar seus lotes e pedir baixa.",
    },
    {
      href: "/diretoria",
      Icone: KeyRoundIcon,
      titulo: "Painel da diretoria",
      texto: "Acesso por código, sem conta.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {itens.map(({ href, Icone, titulo, texto }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-11 items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-vinho/40"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-bege text-dourado-deep">
            <Icone className="size-4" />
          </span>
          <span className="min-w-0">
            <b className="block text-[13.5px] font-extrabold">{titulo}</b>
            <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
              {texto}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/**
 * O estado sem sorteio ativo. Antes era um aviso de cinco linhas; agora é a
 * própria apresentação do sistema — que é o que um visitante de fora de
 * temporada, ou a própria comunidade entre uma campanha e outra, precisa ver.
 */
function SemSorteioAtivo({
  encerrados,
}: {
  encerrados: {
    sorteio: SorteioRow;
    premiado?: { numero_sorteado: number; nome_comprador: string | null };
  }[];
}) {
  const passos = [
    {
      n: "Passo 1",
      titulo: "Faixas por vendedor",
      texto:
        "Cada vendedor recebe um intervalo de cartelas. O sistema não deixa a mesma cartela sair para duas pessoas.",
    },
    {
      n: "Passo 2",
      titulo: "Baixa da prestação de contas",
      texto:
        "Quando o vendedor devolve canhoto e dinheiro, a baixa é registrada — inteira ou em partes.",
    },
    {
      n: "Passo 3",
      titulo: "Placar ao vivo",
      texto:
        "A comunidade acompanha o ranking de vendedores e o andamento da campanha.",
    },
    {
      n: "Passo 4",
      titulo: "Apuração registrada",
      texto:
        "Sorteado o número, o sistema aponta o lote, o vendedor e o comprador daquela cartela.",
    },
  ];

  const beneficios = [
    {
      titulo: "Ninguém vende a mesma cartela duas vezes",
      texto: "O banco recusa faixas sobrepostas — não depende de alguém lembrar.",
    },
    {
      titulo: "Relatório impresso de contingência",
      texto:
        "Se faltar internet no dia do evento, a folha impressa localiza qualquer cartela.",
    },
    {
      titulo: "Prestação de contas transparente",
      texto: "Reservado, confirmado e pendente de cada vendedor, sempre à vista.",
    },
    {
      titulo: "Cartela conferível",
      texto:
        "Cada cartela impressa leva um código que qualquer pessoa pode verificar aqui.",
    },
  ];

  return (
    <>
      <section className="pt-8 sm:pt-11">
        <p className="mb-0.5 font-humming text-[25px] text-dourado-deep">
          nenhum sorteio aberto no momento
        </p>
        <h1 className="text-[32px] font-black leading-[1.04] tracking-tight text-balance sm:text-[48px]">
          O sistema de sorteios da{" "}
          <span className="text-cereja">Paróquia Senhor Bom Jesus</span>.
        </h1>
        <p className="mt-3 max-w-[58ch] text-[15.5px] leading-relaxed text-muted-foreground">
          Assim que a próxima campanha começar, ela aparece aqui — com o placar
          ao vivo aberto a todo mundo. Enquanto isso, veja para que este
          sistema serve.
        </p>
      </section>

      <section className="mt-7 rounded-2xl bg-gradient-to-br from-vinho to-vinho-deep p-6 text-bege sm:p-8">
        {/* Fundo vinho: aqui a variante correta é a monocromática CLARA — a
            colorida perderia contraste (regra da identidade visual). */}
        <Image
          src="/brand/logo-simbolo-mono-claro.svg"
          alt=""
          width={34}
          height={34}
          className="mb-3"
        />
        <p className="font-humming text-[24px] text-dourado">por que ele existe</p>
        <h2 className="mt-0.5 text-[24px] font-black leading-tight sm:text-[34px]">
          Cada cartela no lugar certo, do talão à apuração.
        </h2>
        <p className="mt-2.5 max-w-[62ch] text-[14.5px] leading-relaxed text-bege/85">
          Rifas e sorteios paroquiais sempre foram controlados em caderno e
          planilha. Isso funciona até o dia do sorteio — quando é preciso
          saber, em minutos, quem ficou com a cartela sorteada, se ela foi paga
          e quem a vendeu. Este sistema guarda essa trilha do começo ao fim e
          mostra à comunidade o que não precisa ficar escondido.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {passos.map((p) => (
            <div
              key={p.n}
              className="rounded-xl border border-bege/20 bg-bege/10 p-4"
            >
              <div className="mb-1.5 text-[10.5px] font-black uppercase tracking-[0.12em] text-dourado">
                {p.n}
              </div>
              <b className="block text-[15px] font-black">{p.titulo}</b>
              <span className="mt-1 block text-[12.5px] leading-snug text-bege/80">
                {p.texto}
              </span>
            </div>
          ))}
        </div>
      </section>

      <RotuloSecao
        titulo="O que isso muda na prática"
        nota="para a coordenação e para a comunidade"
      />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {beneficios.map((b) => (
          <div
            key={b.titulo}
            className="rounded-xl border border-border bg-card p-4"
          >
            <b className="block text-[14.5px] font-black">{b.titulo}</b>
            <span className="mt-1 block text-[12.5px] leading-snug text-muted-foreground">
              {b.texto}
            </span>
          </div>
        ))}
      </div>

      {encerrados.length > 0 ? (
        <>
          <RotuloSecao titulo="Sorteios encerrados" nota="o resultado continua no ar" />
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {encerrados.map(({ sorteio, premiado }) => (
              <CardEncerrado key={sorteio.id} sorteio={sorteio} premiado={premiado} />
            ))}
          </div>
        </>
      ) : null}

      <RotuloSecao titulo="Serviços rápidos" nota="sem precisar de conta" />
      <Atalhos />

      <div className="mt-7 flex flex-col gap-3.5 rounded-2xl border border-[#efd9a8] bg-bege p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[50ch] text-[13.5px] leading-relaxed text-[#6b4a22]">
          É da equipe da paróquia? <b className="text-[#4a2f10]">Entre no painel</b>{" "}
          para cadastrar o próximo sorteio, distribuir as faixas e acompanhar as
          baixas.
        </p>
        <Link
          href="/admin"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-cereja px-5 text-[13.5px] font-black text-white hover:bg-vinho-deep sm:w-auto"
        >
          Entrar no painel <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </>
  );
}
