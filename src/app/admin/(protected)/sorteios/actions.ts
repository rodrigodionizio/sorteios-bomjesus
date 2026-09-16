"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sorteioSchema } from "@/lib/validations/sorteio";

export type SorteioFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createSorteio(
  _prevState: SorteioFormState,
  formData: FormData,
): Promise<SorteioFormState> {
  const parsed = sorteioSchema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    cartela_min: formData.get("cartela_min"),
    cartela_max: formData.get("cartela_max"),
    preco_cartela: formData.get("preco_cartela"),
    data_sorteio: formData.get("data_sorteio"),
    premio_titulo: formData.get("premio_titulo"),
    premio_descricao: formData.get("premio_descricao"),
    premio_valor: formData.get("premio_valor"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  // Sorteio e prêmio principal nascem na MESMA transação (regra 22). Um
  // `insert` direto em `sorteios` é recusado pelo banco no commit.
  const { error } = await supabase.rpc("fn_criar_sorteio", {
    p_nome: parsed.data.nome,
    p_descricao: parsed.data.descricao || null,
    p_cartela_min: parsed.data.cartela_min,
    p_cartela_max: parsed.data.cartela_max,
    p_preco_cartela: parsed.data.preco_cartela,
    p_data_sorteio: parsed.data.data_sorteio || null,
    p_premio_titulo: parsed.data.premio_titulo,
    p_premio_descricao: parsed.data.premio_descricao || null,
    p_premio_valor: parsed.data.premio_valor,
  });

  if (error) {
    return { error: `Não foi possível criar o sorteio: ${error.message}` };
  }

  revalidatePath("/admin/sorteios");
  revalidatePath("/admin");
  revalidatePath("/");
  return {};
}

/**
 * Define ou troca o prêmio principal (regra 22).
 *
 * A tela conduz os dois passos — rebaixar o atual, promover o novo — com os
 * alertas de risco; o banco executa os dois JUNTOS em
 * `fn_definir_premio_principal`, para que o sorteio nunca fique sem
 * principal entre um passo e outro. Recusa sozinho depois da apuração.
 */
export async function definirPremioPrincipal(premioId: string, sorteioId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_definir_premio_principal", {
    p_premio_id: premioId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/sorteios");
  revalidatePath(`/admin/sorteios/${sorteioId}/premios`);
  revalidatePath("/admin/apuracao");
  revalidatePath("/");
  revalidatePath(`/placar/${sorteioId}`);
}

export async function updateSorteioStatus(
  sorteioId: string,
  status: "planejado" | "em_andamento" | "encerrado",
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sorteios")
    .update({ status })
    .eq("id", sorteioId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/sorteios");
  revalidatePath("/admin");
  // Mudar o status move o sorteio entre "em andamento", "encerrados" e a
  // faixa de resultado da home — que é ISR e não perceberia sozinha.
  revalidatePath("/");
  revalidatePath(`/placar/${sorteioId}`);
}

export async function regenerarCodigoDiretoria(sorteioId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerar_codigo_diretoria", {
    p_sorteio_id: sorteioId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/sorteios");
  return data;
}
