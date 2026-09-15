"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { premioSchema } from "@/lib/validations/premio";

export type PremioFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

/**
 * O placar e a landing são páginas públicas com cache próprio (ISR). Mudar
 * a premiação sem revalidá-las deixaria o site mostrando a lista antiga até
 * o cache expirar sozinho.
 */
function revalidarTudoQueMostraPremios(sorteioId: string) {
  revalidatePath(`/admin/sorteios/${sorteioId}/premios`);
  revalidatePath("/admin/sorteios");
  revalidatePath("/");
  revalidatePath(`/placar/${sorteioId}`);
}

function camposDoForm(formData: FormData) {
  return {
    categoria: formData.get("categoria"),
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    quantidade: formData.get("quantidade"),
    exibir_publico: formData.get("exibir_publico") === "on",
  };
}

function erros(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return { error: "Confira os campos destacados.", fieldErrors };
}

export async function criarPremio(
  sorteioId: string,
  _prevState: PremioFormState,
  formData: FormData,
): Promise<PremioFormState> {
  const parsed = premioSchema.safeParse(camposDoForm(formData));
  if (!parsed.success) return erros(parsed.error.issues);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `ordem` é posição de exibição, não escolha do usuário: pedir o número
  // na mão só criaria buraco e colisão com a unique (sorteio_id, ordem).
  // Quem quiser reordenar usa as setas na lista.
  const { data: ultimo } = await supabase
    .from("premios_sorteio")
    .select("ordem")
    .eq("sorteio_id", sorteioId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("premios_sorteio").insert({
    sorteio_id: sorteioId,
    ordem: (ultimo?.ordem ?? 0) + 1,
    categoria: parsed.data.categoria,
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao || null,
    valor: parsed.data.valor,
    quantidade: parsed.data.quantidade,
    exibir_publico: parsed.data.exibir_publico,
    criado_por: user?.id ?? null,
  });

  if (error) {
    return { error: `Não foi possível cadastrar o prêmio: ${error.message}` };
  }

  revalidarTudoQueMostraPremios(sorteioId);
  return { success: true };
}

export async function atualizarPremio(
  premioId: string,
  sorteioId: string,
  _prevState: PremioFormState,
  formData: FormData,
): Promise<PremioFormState> {
  const parsed = premioSchema.safeParse(camposDoForm(formData));
  if (!parsed.success) return erros(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase
    .from("premios_sorteio")
    .update({
      categoria: parsed.data.categoria,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao || null,
      valor: parsed.data.valor,
      quantidade: parsed.data.quantidade,
      exibir_publico: parsed.data.exibir_publico,
    })
    .eq("id", premioId);

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidarTudoQueMostraPremios(sorteioId);
  return { success: true };
}

export async function removerPremio(premioId: string, sorteioId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("premios_sorteio").delete().eq("id", premioId);

  if (error) throw new Error(error.message);

  revalidarTudoQueMostraPremios(sorteioId);
}

/**
 * Troca a posição com o vizinho.
 *
 * A `unique (sorteio_id, ordem)` impede o caminho ingênuo de escrever as
 * duas linhas em sequência: o primeiro update já colidiria com a linha que
 * ainda ocupa a posição de destino. Daí o degrau intermediário — uma ordem
 * temporária fora da faixa em uso.
 */
export async function moverPremio(
  premioId: string,
  sorteioId: string,
  direcao: "cima" | "baixo",
) {
  const supabase = await createClient();

  const { data: premios, error: erroLeitura } = await supabase
    .from("premios_sorteio")
    .select("id, ordem")
    .eq("sorteio_id", sorteioId)
    .order("ordem");

  if (erroLeitura) throw new Error(erroLeitura.message);

  const lista = premios ?? [];
  const i = lista.findIndex((p) => p.id === premioId);
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return;

  const atual = lista[i];
  const vizinho = lista[j];
  const TEMP = 9000 + atual.ordem;

  for (const [id, ordem] of [
    [atual.id, TEMP],
    [vizinho.id, atual.ordem],
    [atual.id, vizinho.ordem],
  ] as const) {
    const { error } = await supabase
      .from("premios_sorteio")
      .update({ ordem })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidarTudoQueMostraPremios(sorteioId);
}
