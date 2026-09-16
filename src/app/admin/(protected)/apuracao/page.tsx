import Link from "next/link";
import {
  InfoIcon,
  CheckIcon,
  TriangleAlertIcon,
  TrophyIcon,
  LockIcon,
  StarIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatDateTime } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SorteioSwitcher } from "@/components/admin/sorteio-switcher";
import { ApuracaoForm } from "./apuracao-form";
import { EncerrarButton } from "./encerrar-button";

/**
 * Apuração POR PRÊMIO (migration 16).
 *
 * Antes eram "1º prêmio", "2º prêmio" — posições sem ligação com a
 * premiação cadastrada. Agora cada formulário é um prêmio de cartela
 * sorteada, e o número fica gravado naquele prêmio. É isso que permite ao
 * banco saber qual é a cartela do PRÊMIO PRINCIPAL — e dela, quem leva o
 * prêmio de vendedor da cartela premiada.
 */
export default async function ApuracaoPage() {
  const supabase = await createClient();
  const { sorteios, atual } = await getSorteioAtual();

  const [{ data: resultados }, { data: premios }] = atual
    ? await Promise.all([
        supabase.from("resultados_sorteio").select("*").eq("sorteio_id", atual.id),
        supabase.from("premios_sorteio").select("*").eq("sorteio_id", atual.id).order("ordem"),
      ])
    : [{ data: [] }, { data: [] }];

  const deCartela = (premios ?? [])
    .filter((p) => p.categoria === "cartela_sorteada")
    .sort((a, b) => Number(b.principal) - Number(a.principal) || a.ordem - b.ordem);
  const principal = deCartela.find((p) => p.principal);
  const premiosDeVenda = (premios ?? []).filter(
    (p) => p.categoria === "maior_vendedor" || p.categoria === "vendedor_cartela_premiada",
  );

  const resultadoDo = (premioId: string) =>
    (resultados ?? []).find((r) => r.premio_id === premioId);
  const resultadoPrincipal = principal ? resultadoDo(principal.id) : undefined;
  const comMaiorVendedor = (resultados ?? []).find((r) => r.maior_vendedor_id);

  const vendedorIds = [
    ...(resultados ?? []).map((r) => r.vendedor_id),
    ...(resultados ?? []).map((r) => r.maior_vendedor_id),
  ].filter((v): v is string => Boolean(v));

  const numerosPremiados = (resultados ?? []).map((r) => r.numero_sorteado);

  const [{ data: vendedores }, { data: compradores }] = await Promise.all([
    vendedorIds.length > 0
      ? supabase.from("vendedores").select("*").in("id", vendedorIds)
      : Promise.resolve({ data: [] as { id: string; nome: string; telefone: string }[] }),
    atual && numerosPremiados.length > 0
      ? supabase
          .from("compradores_cartela")
          .select("numero_cartela, nome_comprador, contato_comprador")
          .eq("sorteio_id", atual.id)
          .in("numero_cartela", numerosPremiados)
      : Promise.resolve({
          data: [] as {
            numero_cartela: number;
            nome_comprador: string;
            contato_comprador: string | null;
          }[],
        }),
  ]);

  const apurados = deCartela.filter((p) => resultadoDo(p.id)).length;
  const maiorVendedor = vendedores?.find((v) => v.id === comMaiorVendedor?.maior_vendedor_id);
  const vendedorDoPrincipal = vendedores?.find((v) => v.id === resultadoPrincipal?.vendedor_id);

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
          {atual.status === "encerrado" ? (
            <div className="mb-4.5 flex items-start gap-2.5 rounded-2xl border border-border bg-secondary px-5 py-4 text-[13.5px]">
              <LockIcon className="mt-0.5 size-4.5 shrink-0" />
              <span>
                <strong>Sorteio encerrado.</strong> Os resultados estão
                registrados e nada pode mais ser alterado — nem corrigir um
                número. Proteção para os compradores e para a auditoria.
              </span>
            </div>
          ) : !principal ? (
            <div className="mb-4.5 flex items-start gap-2.5 rounded-2xl border border-bad/30 bg-bad-bg px-5 py-4 text-[13.5px] text-bad">
              <TriangleAlertIcon className="mt-0.5 size-4.5 shrink-0" />
              <span>
                <strong>Este sorteio ainda não tem prêmio principal.</strong> A
                apuração fica bloqueada até ele ser definido — é dele que sai o
                vencedor do prêmio de quem vendeu a cartela premiada.{" "}
                <Link href="/admin/sorteios" className="font-bold underline">
                  Definir na tela Sorteios
                </Link>
              </span>
            </div>
          ) : null}

          <section className="mb-4.5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-black">Prêmios de cartela sorteada</h2>
              <span className="text-[12.5px] font-bold text-muted-foreground">
                {apurados} de {deCartela.length} apurado(s)
              </span>
            </div>
            <p className="max-w-[62ch] text-[13.5px] text-muted-foreground">
              Cada prêmio recebe o número da cartela sorteada para ele. A mesma
              cartela pode ser premiada mais de uma vez. Assim que o primeiro
              número é apurado, <strong className="text-foreground">a premiação
              do sorteio fica congelada</strong> — nenhum prêmio pode mais ser
              alterado, e o prêmio principal não pode mais ser trocado.
            </p>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-info-bg px-4 py-3 text-[13px] font-medium text-info">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Se o número sorteado ainda não tiver baixa registrada, o
                sistema mostra mesmo assim{" "}
                <strong className="text-foreground">quem reservou aquele intervalo</strong> —
                com um aviso de que a venda não foi confirmada. Nome e contato
                do comprador só aparecem aqui; no painel da diretoria e no
                placar público, só o nome. Enquanto o sorteio estiver em andamento,
                digitar um número novo num prêmio já apurado corrige aquele
                prêmio — o anterior fica no histórico de auditoria. Depois de
                encerrado, não há mais correção.
              </span>
            </div>
          </section>

          {deCartela.length === 0 ? (
            <p className="mb-4.5 rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center text-[13.5px] text-muted-foreground">
              Nenhum prêmio de cartela sorteada cadastrado.{" "}
              <Link
                href={`/admin/sorteios/${atual.id}/premios`}
                className="font-bold text-foreground underline"
              >
                Cadastrar a premiação
              </Link>
            </p>
          ) : null}

          <div className="mb-4.5 flex flex-col gap-4">
            {deCartela.map((premio) => {
              const resultado = resultadoDo(premio.id);
              const vendedorCartela = vendedores?.find((v) => v.id === resultado?.vendedor_id);
              const comprador = compradores?.find(
                (c) => c.numero_cartela === resultado?.numero_sorteado,
              );

              return (
                <section
                  key={premio.id}
                  className={`rounded-2xl border bg-card p-5 shadow-sm sm:p-6 ${
                    premio.principal ? "border-dourado-deep/50" : "border-border"
                  }`}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      {premio.principal ? (
                        <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-dourado px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wide text-[#3a1400]">
                          <StarIcon className="size-3" /> Prêmio principal
                        </span>
                      ) : null}
                      <h3 className="text-[17px] font-black leading-tight">{premio.titulo}</h3>
                    </div>
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
                    premioId={premio.id}
                    titulo={premio.titulo}
                    numeroAtual={resultado?.numero_sorteado}
                    bloqueado={!principal || atual.status === "encerrado"}
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

          {/* Prêmios de vendedor: não recebem número. O banco resolve cada um
              — maior vendedor pelo ranking na primeira apuração; o vendedor
              da cartela premiada pela cartela do PRÊMIO PRINCIPAL. */}
          {(resultados ?? []).length > 0 ? (
            <section className="mb-4.5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h3 className="mb-1 text-[16px] font-black">Prêmios de vendedor</h3>
              <p className="mb-4 max-w-[60ch] text-[12.5px] text-muted-foreground">
                Resolvidos pelo sistema, não digitados. O maior vendedor é o 1º
                do ranking no momento da primeira apuração. Quem vendeu a
                cartela premiada é sempre o vendedor da cartela do{" "}
                <strong className="text-foreground">prêmio principal</strong>.
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <VencedorVenda
                  rotulo="Maior vendedor(a)"
                  premios={premiosDeVenda
                    .filter((p) => p.categoria === "maior_vendedor")
                    .map((p) => p.titulo)}
                  vendedor={maiorVendedor}
                  vazio="Ninguém confirmou vendas neste sorteio ainda."
                  selo={
                    <>
                      <TrophyIcon className="size-3.5" /> 1º lugar no ranking
                    </>
                  }
                />
                <VencedorVenda
                  rotulo="Vendeu a cartela do prêmio principal"
                  premios={premiosDeVenda
                    .filter((p) => p.categoria === "vendedor_cartela_premiada")
                    .map((p) => p.titulo)}
                  vendedor={vendedorDoPrincipal}
                  vazio={
                    resultadoPrincipal
                      ? "Nenhum vendedor reservou a cartela do prêmio principal."
                      : "Aguardando a apuração do prêmio principal."
                  }
                  selo={
                    resultadoPrincipal ? (
                      resultadoPrincipal.cartela_confirmada ? (
                        <>
                          <CheckIcon className="size-3.5" /> Venda confirmada
                        </>
                      ) : (
                        <>
                          <TriangleAlertIcon className="size-3.5" /> Venda ainda não confirmada
                        </>
                      )
                    ) : null
                  }
                />
              </div>
            </section>
          ) : null}

          <section className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="mb-1 text-[17px] font-black">Encerrar sorteio</h2>
              <p className="max-w-[52ch] text-[12.5px] text-muted-foreground">
                {apurados < deCartela.length
                  ? `Ainda faltam ${deCartela.length - apurados} prêmio(s). Encerrar não apaga nada, mas a tela deixa de receber lançamentos.`
                  : "Todos os prêmios foram apurados. Encerrar é definitivo: depois disso nada do sorteio pode ser alterado, e ele não pode ser reaberto."}
              </p>
            </div>
            <EncerrarButton sorteioId={atual.id} disabled={atual.status === "encerrado"} />
          </section>
        </>
      )}
    </>
  );
}

function VencedorVenda({
  rotulo,
  premios,
  vendedor,
  vazio,
  selo,
}: {
  rotulo: string;
  premios: string[];
  vendedor?: { nome: string; telefone: string };
  vazio: string;
  selo: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-dourado to-[#f2a23f] p-5 text-[#3a1400]">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#3a1400]/65">
        {rotulo}
      </div>
      {premios.length > 0 ? (
        <div className="mb-2 text-[12.5px] font-bold text-[#3a1400]/80">{premios.join(" · ")}</div>
      ) : null}
      {vendedor ? (
        <>
          <div className="text-lg font-black">{vendedor.nome}</div>
          <div className="text-[13px] font-semibold text-[#3a1400]/70">{vendedor.telefone}</div>
          {selo ? (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/40 px-2.5 py-0.5 text-xs font-extrabold">
              {selo}
            </span>
          ) : null}
        </>
      ) : (
        <p className="text-sm font-semibold">{vazio}</p>
      )}
    </div>
  );
}
