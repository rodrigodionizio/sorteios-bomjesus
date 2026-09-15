import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import { SorteioForm } from "./sorteio-form";
import { StatusActions } from "./status-actions";
import { CodigoDiretoriaCell } from "./codigo-diretoria-cell";
import { PixChaveCell } from "./pix-chave-cell";

export default async function SorteiosPage() {
  const supabase = await createClient();

  const [{ data: sorteios }, { data: resumos }, { data: acessos }, { data: chaves }] =
    await Promise.all([
      supabase.from("sorteios").select("*").order("created_at", { ascending: false }),
      supabase.from("vw_resumo_sorteio").select("*"),
      supabase.from("acessos_diretoria").select("*"),
      supabase.from("pix_chaves").select("id, apelido").eq("ativa", true).order("apelido"),
    ]);

  // Só a contagem por sorteio — a lista completa vive na tela de prêmios.
  const { data: premios } = await supabase
    .from("premios_sorteio")
    .select("sorteio_id, categoria");

  return (
    <>
      <AdminPageHeader breadcrumb="Cadastros / Sorteios" title="Sorteios" />

      <section className="mb-4.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Sorteios cadastrados</h2>
        <p className="mb-4.5 text-[13.5px] text-muted-foreground">
          Mais de um sorteio pode ficar em acompanhamento ao mesmo tempo.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Nome</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Faixa</th>
                <th className="px-3 py-2.5">Preço</th>
                <th className="px-3 py-2.5">Confirmado</th>
                <th className="px-3 py-2.5">Sorteio em</th>
                <th className="px-3 py-2.5">Prêmios</th>
                <th className="px-3 py-2.5">Chave Pix</th>
                <th className="px-3 py-2.5">Painel da diretoria</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {(sorteios ?? []).map((s) => {
                const r = resumos?.find((x) => x.sorteio_id === s.id);
                const pct = r
                  ? Math.round(
                      (r.total_vendidas / Math.max(r.total_cartelas_disponiveis, 1)) * 100,
                    )
                  : 0;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2.5 font-bold">{s.nome}</td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="px-3 py-2.5 font-bold tabular-nums">
                      {s.cartela_min}–{s.cartela_max}
                    </td>
                    <td className="px-3 py-2.5 font-bold tabular-nums">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(s.preco_cartela)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-dourado"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {s.data_sorteio ? formatDate(`${s.data_sorteio}T00:00:00`) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <PremiosCell
                        sorteioId={s.id}
                        cadastrados={
                          (premios ?? []).filter((p) => p.sorteio_id === s.id).length
                        }
                        deCartela={
                          (premios ?? []).filter(
                            (p) =>
                              p.sorteio_id === s.id && p.categoria === "cartela_sorteada",
                          ).length
                        }
                        previstos={s.premios_previstos}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <PixChaveCell
                        sorteioId={s.id}
                        chaveAtualId={s.pix_chave_id}
                        chaves={chaves ?? []}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <CodigoDiretoriaCell
                        sorteioId={s.id}
                        codigoAtual={acessos?.find((a) => a.sorteio_id === s.id)?.codigo ?? null}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusActions sorteioId={s.id} status={s.status} />
                    </td>
                  </tr>
                );
              })}
              {(sorteios ?? []).length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhum sorteio cadastrado ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Novo sorteio</h2>
        <p className="mb-4.5 text-[13.5px] text-muted-foreground">
          Depois de criado, já pode receber reservas de cartelas dos vendedores.
        </p>
        <SorteioForm />
      </section>
    </>
  );
}

/**
 * Atalho para a tela de prêmios, com o aviso de divergência já visível na
 * listagem: `premios_previstos` diz quantos NÚMEROS serão sorteados, e só
 * os prêmios de cartela sorteada contam para ele (ver a migration 14).
 */
function PremiosCell({
  sorteioId,
  cadastrados,
  deCartela,
  previstos,
}: {
  sorteioId: string;
  cadastrados: number;
  deCartela: number;
  previstos: number;
}) {
  const divergente = deCartela !== previstos;

  return (
    <Link
      href={`/admin/sorteios/${sorteioId}/premios`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-bold hover:border-vinho/40"
    >
      {cadastrados === 0 ? (
        <span className="text-muted-foreground">cadastrar</span>
      ) : (
        <span>
          {cadastrados} prêmio{cadastrados > 1 ? "s" : ""}
        </span>
      )}
      {divergente ? (
        <span
          title={`${previstos} número(s) a sortear, ${deCartela} prêmio(s) de cartela cadastrado(s)`}
          className="text-bad"
        >
          !
        </span>
      ) : null}
    </Link>
  );
}
