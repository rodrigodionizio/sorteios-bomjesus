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
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sorteios").insert({
    nome: parsed.data.nome,
    descricao: parsed.data.descricao || null,
    cartela_min: parsed.data.cartela_min,
    cartela_max: parsed.data.cartela_max,
    preco_cartela: parsed.data.preco_cartela,
    data_sorteio: parsed.data.data_sorteio || null,
  });

  if (error) {
    return { error: `Não foi possível criar o sorteio: ${error.message}` };
  }

  revalidatePath("/admin/sorteios");
  revalidatePath("/admin");
  return {};
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
}
