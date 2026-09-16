import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangleIcon, EyeOffIcon, LockIcon, StarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ROTULO_MODALIDADE_ADMIN } from "@/lib/modalidade";
import {
  DESCRICAO_CATEGORIA,
  DESTINATARIO,
  ROTULO_CATEGORIA,
  formatarValor,
  rotuloPremio,
  type Premio,
} from "@/lib/premios";
import { PremioForm } from "./premio-form";
import { PremioRowActions } from "./premio-row-actions";

export default async function PremiosPage({
  params,
}: {
  params: Promise<{ sorteioId: string }>;
}) {
  const { sorteioId } = await params;
  const supabase = await createClient();

  const [{ data: sorteio }, { data: premios }, { data: apuradoRpc }] = await Promise.all([
    supabase.from("sorteios").select("*").eq("id", sorteioId).maybeSingle(),
    supabase
      .from("premios_sorteio")
      .select("*")
      .eq("sorteio_id", sorteioId)
      .order("ordem"),
    supabase.rpc("fn_sorteio_apurado", { p_sorteio_id: sorteioId }),
  ]);

  if (!sorteio) notFound();

  const lista = (premios ?? []) as Premio[];
  // Regra 22: com resultado apurado, o banco recusa qualquer alteração na
  // premiação. A tela vira somente leitura para não oferecer o que falharia.
  const encerrado = sorteio.status === "encerrado";
  // Apurado congela a premiação (R4); encerrado congela o sorteio inteiro (R5).
  const apurado = apuradoRpc === true || encerrado;
  const temPrincipal = lista.some((p) => p.principal);

  // `premios_previstos` (migration 13) diz quantos números o sorteio prevê
  // (no bingo, um por quadro). Desde a migration 16 a apuração é POR PRÊMIO
  // de cartela sorteada — por isso a divergência importa.
  const deCartela = lista.filter((p) => p.categoria === "cartela_sorteada");
  const divergencia = deCartela.length !== sorteio.premios_previstos;

  return (
    <>
      <AdminPageHeader
        breadcrumb="Cadastros / Sorteios / Prêmios"
        title={`Prêmios — ${sorteio.nome}`}
        right={
          <Link
            href="/admin/sorteios"
            className="text-[13px] font-bold text-muted-foreground hover:text-foreground"
          >
            ← Voltar aos sorteios
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 text-[17px] font-black">Premiação cadastrada</h2>
          <p className="mb-4 max-w-[56ch] text-[13.5px] text-muted-foreground">
            É esta lista que o placar público e a página inicial mostram. Até
            existir esta tela, a frase da premiação estava escrita no código e
            era a mesma para todo sorteio.
          </p>

          {apurado ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-secondary px-4 py-3 text-[13px] text-foreground">
              <LockIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>Premiação congelada.</strong>{" "}
                {encerrado
                  ? "Este sorteio está encerrado"
                  : "Este sorteio já tem prêmio apurado"}
                : nenhum prêmio pode ser incluído, alterado, reordenado ou
                removido, e o prêmio principal não pode mais ser trocado.
              </span>
            </div>
          ) : !temPrincipal && lista.length > 0 ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-bad-bg px-4 py-3 text-[13px] text-bad">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>Este sorteio não tem prêmio principal.</strong> Até ele
                ser definido, o banco recusa alterar a premiação e apurar o
                sorteio.{" "}
                <Link href="/admin/sorteios" className="font-bold underline">
                  Definir na tela Sorteios
                </Link>
              </span>
            </div>
          ) : null}

          {divergencia ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-bad-bg px-4 py-3 text-[13px] text-bad">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Este sorteio está configurado para apurar{" "}
                <strong>{sorteio.premios_previstos} número(s) sorteado(s)</strong>
                {sorteio.modalidade === "bingo"
                  ? " (um por quadro da cartela)"
                  : ""}
                , mas há <strong>{deCartela.length}</strong> prêmio(s) de
                cartela sorteada cadastrado(s). A apuração é feita por prêmio:
                só os prêmios de cartela sorteada cadastrados aqui recebem
                número na noite do sorteio.
              </span>
            </div>
          ) : null}

          {lista.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-[13.5px] text-muted-foreground">
              Nenhum prêmio cadastrado. Enquanto estiver assim, o site público
              simplesmente não mostra bloco de premiação nenhum.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {lista.map((premio, i) => (
                <li
                  key={premio.id}
                  className="rounded-xl border border-border bg-secondary/40 p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {premio.principal ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-dourado px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#3a1400]">
                            <StarIcon className="size-3" /> Principal
                          </span>
                        ) : null}
                        <span
                          className={
                            DESTINATARIO[premio.categoria] === "vendedor"
                              ? "rounded-full bg-info-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-info"
                              : "rounded-full bg-bege px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-dourado-deep"
                          }
                        >
                          {ROTULO_CATEGORIA[premio.categoria]}
                        </span>
                        {!premio.exibir_publico ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            <EyeOffIcon className="size-3" /> Oculto
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 text-[16px] font-black leading-tight">
                        {rotuloPremio(premio)}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                        {premio.descricao ||
                          DESCRICAO_CATEGORIA[premio.categoria] ||
                          "—"}
                      </div>
                      {premio.valor !== null ? (
                        <div className="mt-1 text-[12.5px] font-bold tabular-nums text-dourado-deep">
                          {formatarValor(premio.valor)} cada
                          {premio.quantidade > 1
                            ? ` · ${formatarValor(premio.valor * premio.quantidade)} no total`
                            : ""}
                        </div>
                      ) : null}
                    </div>

                    {apurado ? null : (
                      <PremioRowActions
                        premio={premio}
                        podeSubir={i > 0}
                        podeDescer={i < lista.length - 1}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 text-[17px] font-black">Novo prêmio</h2>
          <p className="mb-4 text-[13.5px] text-muted-foreground">
            Modalidade: {ROTULO_MODALIDADE_ADMIN[sorteio.modalidade]} · faixa{" "}
            {sorteio.cartela_min}–{sorteio.cartela_max}
          </p>
          {apurado ? (
            <p className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-3 text-[13px] text-muted-foreground">
              <LockIcon className="size-4 shrink-0" /> Sorteio apurado — a
              premiação não recebe novos prêmios.
            </p>
          ) : (
            <PremioForm sorteioId={sorteioId} />
          )}
        </section>
      </div>
    </>
  );
}
