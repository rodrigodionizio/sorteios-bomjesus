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

  const { data: resultado } = atual
    ? await supabase
        .from("resultados_sorteio")
        .select("*")
        .eq("sorteio_id", atual.id)
        .maybeSingle()
    : { data: null };

  const vendedorIds = [resultado?.vendedor_id, resultado?.maior_vendedor_id].filter(
    (v): v is string => Boolean(v),
  );
  const { data: vendedores } =
    vendedorIds.length > 0
      ? await supabase.from("vendedores").select("*").in("id", vendedorIds)
      : { data: [] };

  const vendedorCartela = vendedores?.find((v) => v.id === resultado?.vendedor_id);
  const maiorVendedor = vendedores?.find((v) => v.id === resultado?.maior_vendedor_id);

  const { data: comprador } =
    resultado && atual
      ? await supabase
          .from("compradores_cartela")
          .select("nome_comprador, contato_comprador")
          .eq("sorteio_id", atual.id)
          .eq("numero_cartela", resultado.numero_sorteado)
          .maybeSingle()
      : { data: null };

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
            <h2 className="mb-1 text-[17px] font-black">Número sorteado</h2>
            <p className="mb-4.5 max-w-[58ch] text-[13.5px] text-muted-foreground">
              Digite o número da cartela sorteada no dia do evento. O sistema
              resolve os dois prêmios automaticamente.
            </p>
            <ApuracaoForm sorteioId={atual.id} />
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-info-bg px-4 py-3 text-[13px] font-medium text-info">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Se o número sorteado ainda não tiver baixa registrada, o
                sistema mostra mesmo assim{" "}
                <strong className="text-foreground">
                  quem reservou aquele intervalo
                </strong>{" "}
                — só que com um aviso de que a venda não foi confirmada. Nome
                e contato do comprador (quando registrados na baixa) só
                aparecem aqui — no painel da diretoria e no placar público,
                só o nome é exibido.
              </span>
            </div>
          </section>

          {resultado ? (
            <div className="mb-4.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-dourado to-[#f2a23f] p-6 text-[#3a1400]">
                <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#3a1400]/65">
                  Cartela premiada · nº {resultado.numero_sorteado}
                </div>
                <div className="text-[22px] font-black">Prêmio da cartela</div>
                <div className="text-[13px] font-semibold text-[#3a1400]/70">
                  Sorteada em {formatDateTime(resultado.sorteado_em)}
                </div>
                {vendedorCartela ? (
                  <div className="mt-3.5 border-t border-[#3a1400]/20 pt-3.5">
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
                  </div>
                ) : (
                  <p className="mt-3.5 text-sm font-semibold">
                    Nenhum vendedor reservou esse número neste sorteio.
                  </p>
                )}
                {comprador ? (
                  <div className="mt-3 rounded-lg bg-white/40 px-3.5 py-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#3a1400]/60">
                      <LockIcon className="size-3" /> Comprador · dado sensível
                    </div>
                    <div className="text-[14.5px] font-black">{comprador.nome_comprador}</div>
                    {comprador.contato_comprador ? (
                      <div className="text-[12px] font-semibold text-[#3a1400]/70">
                        {comprador.contato_comprador}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-dourado to-[#f2a23f] p-6 text-[#3a1400]">
                <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#3a1400]/65">
                  Maior vendedor(a) geral
                </div>
                <div className="text-[22px] font-black">Prêmio da campanha</div>
                {maiorVendedor ? (
                  <div className="mt-3.5 border-t border-[#3a1400]/20 pt-3.5">
                    <div className="text-lg font-black">{maiorVendedor.nome}</div>
                    <div className="text-[13px] font-semibold text-[#3a1400]/70">
                      {maiorVendedor.telefone}
                    </div>
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/40 px-2.5 py-0.5 text-xs font-extrabold">
                      <TrophyIcon className="size-3.5" /> 1º lugar no ranking
                    </span>
                  </div>
                ) : (
                  <p className="mt-3.5 text-sm font-semibold">
                    Ninguém confirmou vendas neste sorteio ainda.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <section className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="mb-1 text-[17px] font-black">Encerrar sorteio</h2>
              <p className="max-w-[48ch] text-[12.5px] text-muted-foreground">
                Marca o sorteio como encerrado. Reservas e baixas continuam no
                histórico, só não recebem mais lançamentos.
              </p>
            </div>
            <EncerrarButton sorteioId={atual.id} disabled={atual.status === "encerrado"} />
          </section>
        </>
      )}
    </>
  );
}
