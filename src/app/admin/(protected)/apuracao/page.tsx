import { InfoIcon, CheckIcon, TriangleAlertIcon, TrophyIcon, LockIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatDateTime } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SorteioSwitcher } from "@/components/admin/sorteio-switcher";
import { ApuracaoForm } from "./apuracao-form";
import { EncerrarButton } from "./encerrar-button";

export default async function ApuracaoPage() {
  const supabase = await createClient();
  const { sorteios, atual } = await getSorteioAtual();

  // Uma linha por prêmio já apurado (schema-v13). Antes era `.maybeSingle()`,
  // que passou a dar erro assim que existisse mais de um.
  const { data: resultados } = atual
    ? await supabase
        .from("resultados_sorteio")
        .select("*")
        .eq("sorteio_id", atual.id)
        .order("ordem")
    : { data: [] };

  const vendedorIds = [
    ...(resultados ?? []).map((r) => r.vendedor_id),
    ...(resultados ?? []).map((r) => r.maior_vendedor_id),
  ].filter((v): v is string => Boolean(v));

  const { data: vendedores } =
    vendedorIds.length > 0
      ? await supabase.from("vendedores").select("*").in("id", vendedorIds)
      : { data: [] };

  // Comprador de cada cartela premiada, quando registrado na baixa.
  const numerosPremiados = (resultados ?? []).map((r) => r.numero_sorteado);
  const { data: compradores } =
    atual && numerosPremiados.length > 0
      ? await supabase
          .from("compradores_cartela")
          .select("numero_cartela, nome_comprador, contato_comprador")
          .eq("sorteio_id", atual.id)
          .in("numero_cartela", numerosPremiados)
      : { data: [] };

  const previstos = atual?.premios_previstos ?? 1;
  const ordens = Array.from({ length: previstos }, (_, i) => i + 1);
  const apurados = (resultados ?? []).length;

  // O maior vendedor é do sorteio, não da sequência: vem do prêmio 1.
  const resultadoPrimeiro = (resultados ?? []).find((r) => r.ordem === 1);
  const maiorVendedor = vendedores?.find(
    (v) => v.id === resultadoPrimeiro?.maior_vendedor_id,
  );

  return (
    <>
      <AdminPageHeader
        breadcrumb="Sorteio / Apuração"
        title="Apuração"
        right={<SorteioSwitcher sorteios={sorteios} currentId={atual?.id ?? null} />}
      />

      {!atual ? (
        <p className="text-muted-foreground">Nenhum sorteio ativo.</p>
      ) : (
        <>
          <section className="mb-4.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-black">
                {previstos === 1 ? "Prêmio do sorteio" : `${previstos} prêmios`}
              </h2>
              <span className="text-[12.5px] font-bold text-muted-foreground">
                {apurados} de {previstos} apurado(s)
              </span>
            </div>
            <p className="max-w-[62ch] text-[13.5px] text-muted-foreground">
              {atual.modalidade === "bingo"
                ? "Cada quadro impresso na cartela concorre a um prêmio — por isso este sorteio tem "
                : "Este sorteio distribui "}
              {previstos} prêmio(s). Apure um de cada vez; a mesma cartela pode
              ser premiada mais de uma vez.
            </p>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-info-bg px-4 py-3 text-[13px] font-medium text-info">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Se o número sorteado ainda não tiver baixa registrada, o
                sistema mostra mesmo assim{" "}
                <strong className="text-foreground">quem reservou aquele intervalo</strong> —
                com um aviso de que a venda não foi confirmada. Nome e contato
                do comprador só aparecem aqui; no painel da diretoria e no
                placar público, só o nome. Digitar um número novo num prêmio já
                apurado corrige aquele prêmio — o anterior fica no histórico de
                auditoria.
              </span>
            </div>
          </section>

          <div className="mb-4.5 flex flex-col gap-4">
            {ordens.map((ordem) => {
              const resultado = (resultados ?? []).find((r) => r.ordem === ordem);
              const vendedorCartela = vendedores?.find(
                (v) => v.id === resultado?.vendedor_id,
              );
              const comprador = compradores?.find(
                (c) => c.numero_cartela === resultado?.numero_sorteado,
              );

              return (
                <section
                  key={ordem}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-[16px] font-black">{ordem}º prêmio</h3>
                    {resultado ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-good-bg px-3 py-1 text-[11.5px] font-extrabold text-good">
                        <CheckIcon className="size-3.5" /> apurado em{" "}
                        {formatDateTime(resultado.sorteado_em)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-secondary px-3 py-1 text-[11.5px] font-bold text-muted-foreground">
                        ainda não apurado
                      </span>
                    )}
                  </div>

                  <ApuracaoForm
                    sorteioId={atual.id}
                    ordem={ordem}
                    numeroAtual={resultado?.numero_sorteado}
                  />

                  {resultado ? (
                    <div className="mt-4 rounded-2xl bg-gradient-to-br from-dourado to-[#f2a23f] p-5 text-[#3a1400]">
                      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#3a1400]/65">
                        Cartela premiada · nº {resultado.numero_sorteado}
                      </div>
                      {vendedorCartela ? (
                        <>
                          <div className="text-lg font-black">{vendedorCartela.nome}</div>
                          <div className="text-[13px] font-semibold text-[#3a1400]/70">
                            {vendedorCartela.telefone}
                          </div>
                          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/40 px-2.5 py-0.5 text-xs font-extrabold">
                            {resultado.cartela_confirmada ? (
                              <>
                                <CheckIcon className="size-3.5" /> Venda confirmada
                              </>
                            ) : (
                              <>
                                <TriangleAlertIcon className="size-3.5" /> Venda ainda não confirmada
                              </>
                            )}
                          </span>
                        </>
                      ) : (
                        <p className="text-sm font-semibold">
                          Nenhum vendedor reservou esse número neste sorteio.
                        </p>
                      )}

                      {comprador ? (
                        <div className="mt-3 rounded-lg bg-white/40 px-3.5 py-3">
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#3a1400]/60">
                            <LockIcon className="size-3" /> Comprador · dado sensível
                          </div>
                          <div className="text-[14.5px] font-black">
                            {comprador.nome_comprador}
                          </div>
                          {comprador.contato_comprador ? (
                            <div className="text-[12px] font-semibold text-[#3a1400]/70">
                              {comprador.contato_comprador}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>

          {/* O maior vendedor é de quem vendeu mais cartelas — não disputa a
              sequência de prêmios. Fica resolvido junto do 1º prêmio. */}
          {resultadoPrimeiro ? (
            <section className="mb-4.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-1 text-[16px] font-black">Maior vendedor(a) geral</h3>
              <p className="mb-4 max-w-[58ch] text-[12.5px] text-muted-foreground">
                Quem vendeu o maior número de cartelas — apurado uma única vez,
                junto do 1º prêmio, independente dos demais.
              </p>
              {maiorVendedor ? (
                <div className="rounded-2xl bg-gradient-to-br from-dourado to-[#f2a23f] p-5 text-[#3a1400]">
                  <div className="text-lg font-black">{maiorVendedor.nome}</div>
                  <div className="text-[13px] font-semibold text-[#3a1400]/70">
                    {maiorVendedor.telefone}
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/40 px-2.5 py-0.5 text-xs font-extrabold">
                    <TrophyIcon className="size-3.5" /> 1º lugar no ranking
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ninguém confirmou vendas neste sorteio ainda.
                </p>
              )}
            </section>
          ) : null}

          <section className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="mb-1 text-[17px] font-black">Encerrar sorteio</h2>
              <p className="max-w-[52ch] text-[12.5px] text-muted-foreground">
                {apurados < previstos
                  ? `Ainda faltam ${previstos - apurados} prêmio(s). Encerrar não apaga nada, mas a tela deixa de receber lançamentos.`
                  : "Todos os prêmios foram apurados. Reservas e baixas continuam no histórico, só não recebem mais lançamentos."}
              </p>
            </div>
            <EncerrarButton sorteioId={atual.id} disabled={atual.status === "encerrado"} />
          </section>
        </>
      )}
    </>
  );
}
