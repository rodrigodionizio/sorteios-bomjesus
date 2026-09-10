import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatDate, formatInt } from "@/lib/format";
import { computeGaps } from "@/lib/gaps";
import { PrintButton } from "../print-button";
import { ReportTabs } from "../report-tabs";

/**
 * Terceiro relatório: uma linha por faixa, em ORDEM NUMÉRICA, sem
 * agrupamento nenhum.
 *
 * O que o diferencia das outras duas abas: aqui a sequência dos números é
 * o eixo. Agrupar por vendedor — como fazem as abas 1 e 2 — quebra
 * justamente a leitura sequencial de quem está conferindo cartela por
 * cartela.
 *
 * **Uma linha por faixa reservada** — o lote inteiro, como foi entregue ao
 * vendedor. Um lote 2201–2250 é uma linha só, mesmo que tenha dez baixas
 * parciais; a coluna "faltam" diz quantas cartelas ainda não foram
 * baixadas. Quebrar o lote em um trecho por baixa (como esta tela fazia na
 * primeira versão) multiplicava as folhas sem acrescentar nada que a aba
 * "Cartelas distribuídas" já não mostre com mais detalhe.
 *
 * As faixas nunca reservadas entram como "disponível". Com elas, a
 * sequência cobre de `cartela_min` a `cartela_max` sem buraco — e a soma
 * das quantidades tem que bater com o total do sorteio, o que torna o
 * relatório conferível contra si mesmo.
 */

type Status = "baixada" | "parcial" | "pendente" | "disponivel";

type Faixa = {
  inicio: number;
  fim: number;
  quantidade: number;
  baixadas: number;
  faltam: number;
  status: Status;
  vendedorNome?: string;
  ultimaBaixaEm?: string;
};

const ROTULO_STATUS: Record<Status, string> = {
  baixada: "Baixada",
  parcial: "Parcial",
  pendente: "Pendente",
  disponivel: "Disponível",
};

export default async function RelatorioFaixasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { atual: sorteio } = await getSorteioAtual();

  const agora = new Date();
  const docId = `RF-${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" })
    .format(agora)
    .replace(/-/g, "")}-${new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(agora)
    .replace(":", "")}`;
  const emitidoEm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(agora);

  if (!sorteio) {
    return <p className="text-muted-foreground">Nenhum sorteio cadastrado.</p>;
  }

  const { data: vendedores } = await supabase.from("vendedores").select("id, nome");

  const { data: lotes } = await supabase
    .from("lotes_cartelas")
    .select("*")
    .eq("sorteio_id", sorteio.id)
    .eq("status", "ativo")
    .order("numero_inicial");

  const loteIds = (lotes ?? []).map((l) => l.id);
  const { data: baixas } =
    loteIds.length > 0
      ? await supabase.from("baixas_cartelas").select("*").in("lote_id", loteIds)
      : { data: [] };

  const vendedorNomePorId = new Map((vendedores ?? []).map((v) => [v.id, v.nome]));

  const faixas: Faixa[] = [];

  // 1. Uma linha por LOTE — a faixa como foi reservada, inteira. Quantas
  // baixas ela recebeu (e em quantas partes) não muda o número de linhas;
  // vira a contagem de "faltam".
  for (const lote of lotes ?? []) {
    const baixasDoLote = (baixas ?? []).filter((b) => b.lote_id === lote.id);
    const baixadas = baixasDoLote.reduce((s, b) => s + b.quantidade, 0);
    const quantidade = lote.numero_final - lote.numero_inicial + 1;
    const faltam = quantidade - baixadas;

    // Data da baixa mais recente: diz há quanto tempo aquele lote não anda.
    const ultimaBaixaEm = baixasDoLote
      .map((b) => b.created_at)
      .sort()
      .at(-1);

    faixas.push({
      inicio: lote.numero_inicial,
      fim: lote.numero_final,
      quantidade,
      baixadas,
      faltam,
      status: faltam === 0 ? "baixada" : baixadas === 0 ? "pendente" : "parcial",
      vendedorNome: vendedorNomePorId.get(lote.vendedor_id) ?? "—",
      ultimaBaixaEm,
    });
  }

  // 2. O que nunca saiu da mão da coordenação. Entra para a sequência não
  // ter buraco: assim dá para descer o dedo pela coluna e conferir que
  // todo número está em alguma linha.
  for (const d of computeGaps(
    sorteio.cartela_min,
    sorteio.cartela_max,
    (lotes ?? []).map((l) => ({ inicio: l.numero_inicial, fim: l.numero_final })),
  )) {
    const quantidade = d.fim - d.inicio + 1;
    faixas.push({
      inicio: d.inicio,
      fim: d.fim,
      quantidade,
      baixadas: 0,
      faltam: 0, // nunca foi distribuída: não há baixa a esperar
      status: "disponivel",
    });
  }

  faixas.sort((a, b) => a.inicio - b.inicio);

  const somaPor = (...status: Status[]) =>
    faixas.filter((f) => status.includes(f.status)).reduce((s, f) => s + f.quantidade, 0);

  const totalBaixadas = faixas.reduce((s, f) => s + f.baixadas, 0);
  const totalPendentes = faixas.reduce((s, f) => s + f.faltam, 0);
  const totalDisponiveis = somaPor("disponivel");
  const totalCartelas = sorteio.cartela_max - sorteio.cartela_min + 1;

  return (
    <div className="bg-[#ded2c3] px-4 py-9 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[820px] items-center justify-between no-print">
        <span className="rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-background">
          {sorteio.nome}
        </span>
        <PrintButton />
      </div>

      <ReportTabs active="faixas" />

      <div className="relative overflow-hidden border border-[#e4d9c8] bg-[#fffdf8] text-[#241012] shadow-2xl print:border-none print:shadow-none mx-auto max-w-[820px]">
        <Image
          src="/brand/logo-simbolo-mono-escuro.svg"
          alt=""
          width={200}
          height={200}
          className="pointer-events-none absolute -right-6 bottom-6 opacity-[0.05] print:opacity-[0.06]"
        />

        <div className="relative flex items-start justify-between gap-4 bg-gradient-to-br from-vinho to-vinho-deep px-8 py-6 text-bege">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/logo-simbolo-mono-claro.svg" alt="" width={30} height={30} />
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-bege/65">
                Paróquia Senhor Bom Jesus
              </div>
              <h1 className="mt-0.5 text-xl font-black">
                Relatório de Faixas em Ordem Numérica
              </h1>
              <div className="mt-0.5 text-[12.5px] font-semibold text-bege/80">
                {sorteio.nome} — cartelas {sorteio.cartela_min} a {sorteio.cartela_max}
              </div>
            </div>
          </div>
          <div className="shrink-0 -rotate-2 rounded-md border border-dashed border-bege/55 px-3 py-2 text-right font-mono">
            <div className="mb-0.5 text-[10px] tracking-wide text-bege/60">DOC Nº {docId}</div>
            <div className="text-[13.5px] font-bold">
              {emitidoEm}
              <small className="mt-0.5 block text-[9.5px] font-normal text-bege/65">
                América/Fortaleza (UTC−3)
              </small>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap border-b border-[#e4d9c8]">
          <MetaItem label="Emitido por" value={user?.email ?? "—"} />
          <MetaItem label="Perfil" value="Administrador" />
          <MetaItem label="Origem" value="Painel administrativo · sorteios-bomjesus" />
          <MetaItem label="Finalidade" value="Conferência sequencial" />
        </div>

        <div className="flex border-b border-[#e4d9c8] px-8 py-4.5">
          <SumTile n={formatInt(totalCartelas)} l="Cartelas do sorteio" />
          <SumTile n={formatInt(totalBaixadas)} l="Baixadas" gold />
          <SumTile n={formatInt(totalPendentes)} l="Reservadas pendentes" tone="bad" />
          <SumTile n={formatInt(totalDisponiveis)} l="Disponíveis" tone="muted" />
        </div>

        <div className="px-8 pt-6">
          <h2 className="mb-1 inline-block border-b-2 border-dourado pb-0.5 text-[15px] font-black">
            Faixas na ordem dos números
          </h2>
          <span className="ml-2 text-[11px] font-bold text-[#9c8788]">
            — {formatInt(faixas.length)} faixa(s)
          </span>
          <p className="mb-4 mt-1.5 max-w-[62ch] text-xs text-[#6d5658]">
            Uma linha por faixa reservada, inteira — mesmo quando a baixa veio
            em partes. A coluna <strong>Faltam</strong> diz quantas cartelas
            daquela faixa ainda não foram baixadas; para ver <em>quais</em>
            trechos faltam, use a aba &quot;Cartelas distribuídas&quot;. A
            sequência não tem buracos: a soma das quantidades fecha com o total
            do sorteio.
          </p>

          <table className="w-full border-collapse text-xs">
            {/* `table-header-group` faz o cabeçalho se repetir em toda folha
                impressa; sem isso, da segunda página em diante ninguém sabe
                o que é cada coluna. */}
            <thead className="print:table-header-group">
              <tr className="text-left text-[9.5px] font-bold uppercase tracking-wide text-[#9c8788]">
                <th className="w-[104px] border-b-[1.5px] border-foreground px-2 py-1.5">Faixa</th>
                <th className="w-[52px] border-b-[1.5px] border-foreground px-2 py-1.5 text-right">
                  Qtd.
                </th>
                <th className="w-[62px] border-b-[1.5px] border-foreground px-2 py-1.5 text-right">
                  Baixadas
                </th>
                <th className="w-[54px] border-b-[1.5px] border-foreground px-2 py-1.5 text-right">
                  Faltam
                </th>
                <th className="w-[86px] border-b-[1.5px] border-foreground px-2 py-1.5">Status</th>
                <th className="border-b-[1.5px] border-foreground px-2 py-1.5">Vendedor</th>
                <th className="w-[104px] border-b-[1.5px] border-foreground px-2 py-1.5">
                  Última baixa
                </th>
              </tr>
            </thead>
            <tbody>
              {faixas.map((f) => (
                <tr
                  key={`${f.inicio}-${f.status}`}
                  className={`border-b border-[#e4d9c8] break-inside-avoid ${
                    f.status === "disponivel" ? "bg-[#faf6ee] text-[#9c8788]" : ""
                  }`}
                >
                  <td className="px-2 py-1.5 font-bold tabular-nums whitespace-nowrap">
                    {f.inicio === f.fim ? f.inicio : `${f.inicio} – ${f.fim}`}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatInt(f.quantidade)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {f.status === "disponivel" ? "—" : formatInt(f.baixadas)}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right tabular-nums ${
                      f.faltam > 0 ? "font-bold text-bad" : ""
                    }`}
                  >
                    {f.status === "disponivel" ? "—" : formatInt(f.faltam)}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
                        f.status === "baixada"
                          ? "bg-good-bg text-good"
                          : f.status === "parcial"
                            ? "bg-dourado/25 text-dourado-deep"
                            : f.status === "pendente"
                              ? "bg-bad-bg text-bad"
                              : "bg-[#efe7d9] text-[#9c8788]"
                      }`}
                    >
                      {ROTULO_STATUS[f.status]}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    {f.vendedorNome ?? (
                      <span className="text-[10.5px] text-[#9c8788]">
                        ninguém — nunca distribuída
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-[10.5px] text-[#9c8788]">
                    {f.ultimaBaixaEm ? formatDate(f.ultimaBaixaEm) : "—"}
                  </td>
                </tr>
              ))}
              {faixas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-[#9c8788]">
                    Nenhuma cartela distribuída ainda neste sorteio.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-7.5 border-t-2 border-foreground px-8 pb-7.5 pt-6.5 print:pb-20">
          <div className="border-t border-foreground pt-1.5 text-[11px] text-[#6d5658]">
            Assinatura do(a) responsável pela conferência
            <br />
            <span className="font-bold text-foreground">Coordenação do sorteio</span>
          </div>
          <div className="border-t border-foreground pt-1.5 text-[11px] text-[#6d5658]">
            Data da conferência
            <br />
            <span className="font-bold text-foreground">___ / ___ / ______</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#e4d9c8] bg-[#fffdf8] px-8 py-4 print:fixed print:inset-x-0 print:bottom-0 print:z-10 print:mx-auto print:max-w-[820px]">
          <Image src="/brand/logo-horizontal.svg" alt="Sorteios Bom Jesus" width={140} height={42} />
          <div className="text-right font-mono text-[10px] text-[#9c8788]">
            Relatório {docId} · gerado automaticamente pelo sistema em {emitidoEm}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 border-r border-[#e4d9c8] px-5 py-3 last:border-r-0">
      <div className="mb-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#9c8788]">
        {label}
      </div>
      <div className="text-[13px] font-bold">{value}</div>
    </div>
  );
}

function SumTile({
  n,
  l,
  gold,
  tone,
}: {
  n: string;
  l: string;
  gold?: boolean;
  tone?: "bad" | "muted";
}) {
  const color = gold
    ? "text-dourado-deep"
    : tone === "bad"
      ? "text-bad"
      : tone === "muted"
        ? "text-muted-foreground"
        : "text-vinho-deep";
  return (
    <div className="flex-1 border-r border-[#e4d9c8] text-center last:border-r-0">
      <div className={`text-2xl font-black tabular-nums ${color}`}>{n}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9c8788]">{l}</div>
    </div>
  );
}
