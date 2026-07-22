import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatInt } from "@/lib/format";
import { computeGaps } from "@/lib/gaps";
import { PrintButton } from "./print-button";

export default async function RelatorioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { atual: sorteio } = await getSorteioAtual();

  const now = new Date();
  const docId = `RB-${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(now).replace(/-/g, "")}-${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).replace(":", "")}`;
  const emitidoEm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(now);

  if (!sorteio) {
    return <p className="text-muted-foreground">Nenhum sorteio cadastrado.</p>;
  }

  const [{ data: vendedores }, { data: resumoRows }] = await Promise.all([
    supabase.from("vendedores").select("*").order("nome"),
    supabase.from("vw_resumo_sorteio").select("*").eq("sorteio_id", sorteio.id).limit(1),
  ]);
  const resumo = resumoRows?.[0];

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

  const vendedoresComLote = (vendedores ?? []).filter((v) =>
    (lotes ?? []).some((l) => l.vendedor_id === v.id),
  );

  return (
    <div className="bg-[#ded2c3] px-4 py-9 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[820px] items-center justify-between no-print">
        <span className="rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-background">
          {sorteio.nome}
        </span>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[820px] border border-[#e4d9c8] bg-[#fffdf8] text-[#241012] shadow-2xl print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-vinho to-vinho-deep px-8 py-6 text-bege">
          <div className="flex items-center gap-2.5">
            <span className="text-[22px]">🎟️</span>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-bege/65">
                Paróquia Senhor Bom Jesus
              </div>
              <h1 className="mt-0.5 text-xl font-black">
                Relatório de Vendedores e Cartelas
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
          <MetaItem label="Finalidade" value="Conferência / contingência" />
        </div>

        {resumo ? (
          <div className="flex border-b border-[#e4d9c8] px-8 py-4.5">
            <SumTile n={formatInt(vendedoresComLote.length)} l="Vendedores" />
            <SumTile n={formatInt(resumo.total_cartelas_disponiveis)} l="Cartelas do sorteio" />
            <SumTile n={formatInt(resumo.total_reservadas)} l="Reservadas" />
            <SumTile
              n={`${formatInt(resumo.total_vendidas)}`}
              l={`Confirmadas (${Math.round((resumo.total_vendidas / Math.max(resumo.total_cartelas_disponiveis, 1)) * 100)}%)`}
              gold
            />
          </div>
        ) : null}

        <div className="px-8 pt-6">
          <h2 className="mb-1 inline-block border-b-2 border-dourado pb-0.5 text-[15px] font-black">
            Detalhamento por vendedor
          </h2>
          <p className="mb-4.5 mt-1.5 max-w-[62ch] text-xs text-[#6d5658]">
            Cada linha mostra o intervalo reservado, o que já foi confirmado
            (baixa) e o que ainda está pendente — use esta lista para
            localizar manualmente quem vendeu qualquer cartela, caso o
            sistema esteja indisponível.
          </p>

          {vendedoresComLote.map((v) => {
            const lotesDoVendedor = (lotes ?? []).filter((l) => l.vendedor_id === v.id);
            const totalReservado = lotesDoVendedor.reduce((s, l) => s + l.quantidade, 0);
            const baixasDoVendedor = (baixas ?? []).filter((b) =>
              lotesDoVendedor.some((l) => l.id === b.lote_id),
            );
            const totalConfirmado = baixasDoVendedor.reduce((s, b) => s + b.quantidade, 0);

            return (
              <div key={v.id} className="mb-5.5 break-inside-avoid">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2.5 border-b border-foreground pb-1.5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[14.5px] font-black">{v.nome}</span>
                    <span className="text-[11.5px] tabular-nums text-[#6d5658]">
                      {v.telefone}
                    </span>
                  </div>
                  <span
                    className={`text-[10.5px] font-bold uppercase tracking-wide ${v.ativo ? "text-good" : "text-muted-foreground"}`}
                  >
                    {v.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <div className="flex gap-4 text-[11.5px]">
                    <span>
                      Reservado <b className="tabular-nums">{totalReservado}</b>
                    </span>
                    <span className="text-dourado-deep">
                      Confirmado <b className="tabular-nums">{totalConfirmado}</b>
                    </span>
                    <span>
                      Pendente <b className="tabular-nums">{totalReservado - totalConfirmado}</b>
                    </span>
                  </div>
                </div>

                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-[9.5px] font-bold uppercase tracking-wide text-[#9c8788]">
                      <th className="px-2 py-1.5">Intervalo reservado</th>
                      <th className="px-2 py-1.5">Tipo</th>
                      <th className="px-2 py-1.5">Confirmado</th>
                      <th className="px-2 py-1.5">Pendente</th>
                      <th className="px-2 py-1.5">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotesDoVendedor.map((lote) => {
                      const baixasDoLote = (baixas ?? []).filter((b) => b.lote_id === lote.id);
                      const gaps = computeGaps(
                        lote.numero_inicial,
                        lote.numero_final,
                        baixasDoLote.map((b) => ({ inicio: b.numero_inicial, fim: b.numero_final })),
                      );
                      return (
                        <tr key={lote.id} className="border-b border-[#e4d9c8] align-top">
                          <td className="px-2 py-1.5 font-bold tabular-nums">
                            {lote.numero_inicial === lote.numero_final
                              ? lote.numero_inicial
                              : `${lote.numero_inicial} – ${lote.numero_final}`}
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="rounded-full bg-bege px-2 py-0.5 text-[9.5px] font-bold text-dourado-deep capitalize">
                              {lote.tipo}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            {baixasDoLote.length > 0 ? (
                              baixasDoLote.map((b) => (
                                <span
                                  key={b.id}
                                  className="mb-1 mr-1 inline-block rounded bg-good-bg px-1.5 py-0.5 text-[10.5px] font-bold text-good"
                                >
                                  {b.numero_inicial === b.numero_final
                                    ? b.numero_inicial
                                    : `${b.numero_inicial}–${b.numero_final}`}{" "}
                                  · {b.forma_confirmacao}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10.5px] italic text-[#9c8788]">nenhuma ainda</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {gaps.length > 0 ? (
                              gaps.map((g, i) => (
                                <span
                                  key={i}
                                  className="mb-1 mr-1 inline-block rounded bg-bad-bg px-1.5 py-0.5 text-[10.5px] font-bold text-bad"
                                >
                                  {g.inicio === g.fim ? g.inicio : `${g.inicio}–${g.fim}`}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10.5px] text-[#9c8788]">—</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-[10.5px] capitalize text-[#9c8788]">
                            {lote.origem}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {vendedoresComLote.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum vendedor com cartelas reservadas neste sorteio ainda.
            </p>
          ) : null}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-7.5 border-t-2 border-foreground px-8 pb-7.5 pt-6.5">
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

        <div className="flex justify-between border-t border-[#e4d9c8] px-8 py-4 font-mono text-[10px] text-[#9c8788]">
          <span>
            Relatório {docId} · gerado automaticamente pelo sistema em {emitidoEm}
          </span>
          <span>Página 1 de 1</span>
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

function SumTile({ n, l, gold }: { n: string; l: string; gold?: boolean }) {
  return (
    <div className="flex-1 border-r border-[#e4d9c8] text-center last:border-r-0">
      <div className={`text-2xl font-black tabular-nums ${gold ? "text-dourado-deep" : "text-vinho-deep"}`}>
        {n}
      </div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9c8788]">
        {l}
      </div>
    </div>
  );
}
