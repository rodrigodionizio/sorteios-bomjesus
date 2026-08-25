import { StarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { TIPOS_CHAVE_PIX } from "@/lib/pix";
import { PixForm } from "./pix-form";
import { ChaveRowActions } from "./chave-row-actions";

const ROTULO_TIPO = Object.fromEntries(TIPOS_CHAVE_PIX.map((t) => [t.valor, t.rotulo]));

export default async function PixPage() {
  const supabase = await createClient();

  const [{ data: chaves }, { data: sorteios }] = await Promise.all([
    supabase.from("pix_chaves").select("*").order("criado_em", { ascending: false }),
    supabase.from("sorteios").select("id, nome, pix_chave_id"),
  ]);

  const sorteiosPorChave = new Map<string, string[]>();
  for (const s of sorteios ?? []) {
    if (!s.pix_chave_id) continue;
    const lista = sorteiosPorChave.get(s.pix_chave_id) ?? [];
    lista.push(s.nome);
    sorteiosPorChave.set(s.pix_chave_id, lista);
  }

  return (
    <>
      <AdminPageHeader breadcrumb="Cadastros / Chaves Pix" title="Chaves Pix" />

      <section className="mb-4.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Chaves cadastradas</h2>
        <p className="mb-4.5 max-w-[70ch] text-[13.5px] text-muted-foreground">
          A chave alimenta o QR impresso nas cartelas. Uma mesma chave pode
          servir a vários sorteios, mas cada sorteio recebe apenas uma — o
          vínculo é feito em <strong className="text-foreground">Sorteios</strong>.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Apelido</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Chave</th>
                <th className="px-3 py-2.5">Recebedor</th>
                <th className="px-3 py-2.5">Mensagem</th>
                <th className="px-3 py-2.5">Sorteios</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {(chaves ?? []).map((c) => {
                const usos = sorteiosPorChave.get(c.id) ?? [];
                return (
                  <tr
                    key={c.id}
                    className={`border-t border-border ${c.ativa ? "" : "opacity-55"}`}
                  >
                    <td className="px-3 py-2.5 font-bold">
                      <span className="flex items-center gap-1.5">
                        {c.apelido}
                        {c.padrao ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-dourado px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3a1400]">
                            <StarIcon className="size-2.5" /> padrão
                          </span>
                        ) : null}
                      </span>
                      {!c.ativa ? (
                        <span className="text-[11px] font-normal text-muted-foreground">
                          desativada
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {ROTULO_TIPO[c.tipo] ?? c.tipo}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">{c.chave}</td>
                    <td className="px-3 py-2.5">
                      {c.nome_recebedor}
                      <span className="block text-[11px] text-muted-foreground">{c.cidade}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">{c.mensagem ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                      {usos.length > 0 ? usos.join(", ") : "nenhum ainda"}
                    </td>
                    <td className="px-3 py-2.5">
                      <ChaveRowActions chave={c} />
                    </td>
                  </tr>
                );
              })}
              {(chaves ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhuma chave cadastrada ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Nova chave Pix</h2>
        <p className="mb-4.5 max-w-[70ch] text-[13.5px] text-muted-foreground">
          Prefira uma chave <strong className="text-foreground">aleatória (EVP)</strong> ou o{" "}
          <strong className="text-foreground">CNPJ</strong> da paróquia: a chave sai impressa em
          centenas de cartelas, e telefone ou CPF viram dado pessoal circulando na rua.
        </p>
        <PixForm />
      </section>
    </>
  );
}
