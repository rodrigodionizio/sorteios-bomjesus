"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pixChaveSchema } from "@/lib/validations/pix";

export type PixFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function criarChavePix(
  _prevState: PixFormState,
  formData: FormData,
): Promise<PixFormState> {
  const parsed = pixChaveSchema.safeParse({
    apelido: formData.get("apelido"),
    tipo: formData.get("tipo"),
    chave: formData.get("chave"),
    nome_recebedor: formData.get("nome_recebedor"),
    cidade: formData.get("cidade"),
    mensagem: formData.get("mensagem"),
    banco: formData.get("banco"),
    observacoes: formData.get("observacoes"),
    padrao: formData.get("padrao") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("pix_chaves").insert({
    ...parsed.data,
    mensagem: parsed.data.mensagem ?? null,
    banco: parsed.data.banco || null,
    observacoes: parsed.data.observacoes || null,
    padrao: parsed.data.padrao ?? false,
    criado_por: user?.id ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Essa chave já está cadastrada.",
        fieldErrors: { chave: "Chave duplicada." },
      };
    }
    return { error: `Não foi possível cadastrar: ${error.message}` };
  }

  revalidatePath("/admin/pix");
  revalidatePath("/admin/sorteios");
  return { success: true };
}

export async function definirChavePadrao(chaveId: string) {
  const supabase = await createClient();
  // O trigger `trg_pix_chave_padrao` desmarca a anterior sozinho — por isso
  // aqui é um update simples, e não dois.
  const { error } = await supabase
    .from("pix_chaves")
    .update({ padrao: true })
    .eq("id", chaveId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/pix");
}

export async function alternarChaveAtiva(chaveId: string, ativa: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("pix_chaves").update({ ativa }).eq("id", chaveId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/pix");
  revalidatePath("/admin/sorteios");
}

/**
 * Vincula a chave ao sorteio — um sorteio recebe no máximo uma, e a mesma
 * chave pode servir a quantos sorteios quiser. Passar `null` desvincula.
 */
export async function vincularChaveAoSorteio(sorteioId: string, chaveId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sorteios")
    .update({ pix_chave_id: chaveId })
    .eq("id", sorteioId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/sorteios");
  revalidatePath("/admin/cartelas/gerar");
}
