import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatDate, formatInt } from "@/lib/format";
import { computeGaps, type Range } from "@/lib/gaps";
import { PrintButton } from "../print-button";
import { ReportTabs } from "../report-tabs";

type FaixaComVendedor = Range & { vendedorNome: string };

export default async function RelatorioCartelasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { atual: sorteio } = await getSorteioAtual();

  const now = new Date();
  const docId = `RC-${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(now).replace(/-/g, "")}-${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).replace(":", "")}`;
  const emitidoEm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(now);

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
  const lotePorId = new Map((lotes ?? []).map((l) => [l.id, l]));

  // 1. Cartelas baixadas — todas as baixas do sorteio, achatadas e ordenadas
  // por número, sem agrupar por vendedor (o vendedor aparece só como coluna).
  const baixadas = (baixas ?? [])
    .map((b) => ({
      ...b,
      vendedorNome: vendedorNomePorId.get(lotePorId.get(b.lote_id)?.vendedor_id ?? "") ?? "—",
    }))
    .sort((a, b) => a.numero_inicial - b.numero_inicial);
  const totalBaixadas = baixadas.reduce((s, b) => s + b.quantidade, 0);

  // 2. Cartelas reservadas — o que sobra em cada lote depois de descontar
  // suas próprias baixas (computeGaps por lote); se um lote foi confirmado
  // em partes separadas, cada parte gera seu próprio "buraco" aqui, em vez
  // de um intervalo só.
  const reservadas: FaixaComVendedor[] = [];
  for (const lote of lotes ?? []) {
    const baixasDoLote = (baixas ?? []).filter((b) => b.lote_id === lote.id);
    const gaps = computeGaps(
      lote.numero_inicial,
      lote.numero_final,
      baixasDoLote.map((b) => ({ inicio: b.numero_inicial, fim: b.numero_final })),
    );
    for (const g of gaps) {
      reservadas.push({
        ...g,
        vendedorNome: vendedorNomePorId.get(lote.vendedor_id) ?? "—",
      });
    }
  }
  reservadas.sort((a, b) => a.inicio - b.inicio);
  const totalReservadas = reservadas.reduce((s, f) => s + (f.fim - f.inicio + 1), 0);

  // 3. Cartelas disponíveis — o que sobra no sorteio inteiro depois de
  // descontar todos os lotes, de qualquer vendedor.
  const disponiveis = computeGaps(
    sorteio.cartela_min,
    sorteio.cartela_max,
    (lotes ?? []).map((l) => ({ inicio: l.numero_inicial, fim: l.numero_final })),
  );
  const totalDisponiveis = disponiveis.reduce((s, g) => s + (g.fim - g.inicio + 1), 0);

  const totalCartelas = sorteio.cartela_max - sorteio.cartela_min + 1;

  return (
    <div className="bg-[#ded2c3] px-4 py-9 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[820px] items-center justify-between no-print">
        <span className="rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-background">
          {sorteio.nome}
        </span>
        <PrintButton />
      </div>

      <ReportTabs active="cartelas" />

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
            <Image
              src="/brand/logo-simbolo-mono-claro.svg"
              alt=""
              width={30}
              height={30}
            />
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-bege/65">
                Paróquia Senhor Bom Jesus
              </div>
              <h1 className="mt-0.5 text-xl font-black">
                Relatório de Cartelas Distribuídas
              </h1>
              <div className="mt-0.5 text-[12.5px] font-semibold text-bege/80">
                {sorteio.nome} — cartelas {sorteio.cartela_min} a {sorteio.cartela_max}
              </div>
            </div>
          </div>
          <div className="shrink-0 -rotate-2 rounded-md border border-dashed border-bege/55 px-3 py-2 text-right font-mono">
            <div className="mb-0.5 text-[10px] tracking-wide text-bege/60">
              DOC Nº {docId}
            </div>
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
          <MetaItem label="Finalidade" value="Conferência de cartelas recebidas" />
        </div>

        <div className="flex border-b border-[#e4d9c8] px-8 py-4.5">
          <SumTile n={formatInt(totalCartelas)} l="Cartelas do sorteio" />
          <SumTile n={formatInt(totalBaixadas)} l="Baixadas" gold />
          <SumTile n={formatInt(totalReservadas)} l="Reservadas (aguard. baixa)" tone="bad" />
          <SumTile n={formatInt(totalDisponiveis)} l="Disponíveis" tone="muted" />
        </div>

        <div className="px-8 pt-6">
          <h2 className="mb-1 inline-block border-b-2 border-dourado pb-0.5 text-[15px] font-black">
            Cartelas baixadas
          </h2>
          <span className="ml-2 text-[11px] font-bold text-[#9c8788]">
            — {formatInt(totalBaixadas)} cartela(s), {baixadas.length} lançamento(s)
          </span>
          <p className="mb-4.5 mt-1.5 max-w-[62ch] text-xs text-[#6d5658]">
            Todas as baixas confirmadas neste sorteio, em ordem de número — sem
            agrupar por vendedor. Use para conferir fisicamente o que já foi
            recebido.
          </p>
          <table className="mb-6 w-full border-collapse text-xs">
            <thead>
              <tr className="text-left text-[9.5px] font-bold uppercase tracking-wide text-[#9c8788]">
                <th className="px-2 py-1.5">Intervalo</th>
                <th className="px-2 py-1.5">Qtd.</th>
                <th className="px-2 py-1.5">Vendedor</th>
                <th className="px-2 py-1.5">Forma</th>
                <th className="px-2 py-1.5">Data</th>
              </tr>
            </thead>
            <tbody>
              {baixadas.map((b) => (
                <tr key={b.id} className="border-b border-[#e4d9c8]">
                  <td className="px-2 py-1.5 font-bold tabular-nums">
                    {b.numero_inicial === b.numero_final
                      ? b.numero_inicial
                      : `${b.numero_inicial} – ${b.numero_final}`}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{formatInt(b.quantidade)}</td>
                  <td className="px-2 py-1.5">{b.vendedorNome}</td>
                  <td className="px-2 py-1.5">
                    <span className="inline-block rounded bg-good-bg px-1.5 py-0.5 text-[10.5px] font-bold capitalize text-good">
                      {b.forma_confirmacao}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-[10.5px] text-[#9c8788]">
                    {formatDate(b.created_at)}
                  </td>
                </tr>
              ))}
              {baixadas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-[#9c8788]">
                    Nenhuma baixa confirmada ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <h2 className="mb-1 inline-block border-b-2 border-dourado pb-0.5 text-[15px] font-black">
            Cartelas reservadas
          </h2>
          <span className="ml-2 text-[11px] font-bold text-[#9c8788]">
            — {formatInt(totalReservadas)} cartela(s), aguardando baixa
          </span>
          <p className="mb-4.5 mt-1.5 max-w-[62ch] text-xs text-[#6d5658]">
            Números que já estão com algum vendedor, mas ainda não foram
            confirmados — o que falta cobrar/receber.
          </p>
          <table className="mb-6 w-full border-collapse text-xs">
            <thead>
              <tr className="text-left text-[9.5px] font-bold uppercase tracking-wide text-[#9c8788]">
                <th className="px-2 py-1.5">Intervalo</th>
                <th className="px-2 py-1.5">Qtd.</th>
                <th className="px-2 py-1.5">Vendedor</th>
              </tr>
            </thead>
            <tbody>
              {reservadas.map((f, i) => (
                <tr key={i} className="border-b border-[#e4d9c8]">
                  <td className="px-2 py-1.5 font-bold tabular-nums">
                    {f.inicio === f.fim ? f.inicio : `${f.inicio} – ${f.fim}`}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{formatInt(f.fim - f.inicio + 1)}</td>
                  <td className="px-2 py-1.5">{f.vendedorNome}</td>
                </tr>
              ))}
              {reservadas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-4 text-center text-[#9c8788]">
                    Nenhuma cartela reservada aguardando baixa.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <h2 className="mb-1 inline-block border-b-2 border-dourado pb-0.5 text-[15px] font-black">
            Cartelas disponíveis
          </h2>
          <span className="ml-2 text-[11px] font-bold text-[#9c8788]">
            — {formatInt(totalDisponiveis)} cartela(s), nunca reservadas
          </span>
          <p className="mb-4.5 mt-1.5 max-w-[62ch] text-xs text-[#6d5658]">
            Números que ainda não foram entregues a ninguém — o que sobra para
            distribuir.
          </p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-left text-[9.5px] font-bold uppercase tracking-wide text-[#9c8788]">
                <th className="px-2 py-1.5">Intervalo</th>
                <th className="px-2 py-1.5">Qtd.</th>
              </tr>
            </thead>
            <tbody>
              {disponiveis.map((g, i) => (
                <tr key={i} className="border-b border-[#e4d9c8]">
                  <td className="px-2 py-1.5 font-bold tabular-nums">
                    {g.inicio === g.fim ? g.inicio : `${g.inicio} – ${g.fim}`}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{formatInt(g.fim - g.inicio + 1)}</td>
                </tr>
              ))}
              {disponiveis.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-2 py-4 text-center text-[#9c8788]">
                    Nenhuma cartela disponível — o sorteio inteiro já foi distribuído.
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
          <Image
            src="/brand/logo-horizontal.svg"
            alt="Sorteios Bom Jesus"
            width={140}
            height={42}
          />
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
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9c8788]">
        {l}
      </div>
    </div>
  );
}
