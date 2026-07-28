"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { baixaSchema } from "@/lib/validations/baixa";
import { computeGaps } from "@/lib/gaps";

export type BaixaFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function createBaixa(
  _prevState: BaixaFormState,
  formData: FormData,
): Promise<BaixaFormState> {
  const parsed = baixaSchema.safeParse({
    lote_id: formData.get("lote_id"),
    numero_inicial: formData.get("numero_inicial"),
    numero_final: formData.get("numero_final"),
    forma_confirmacao: formData.get("forma_confirmacao"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const { lote_id, numero_inicial, numero_final, forma_confirmacao } =
    parsed.data;
  const supabase = await createClient();

  const { data: lote } = await supabase
    .from("lotes_cartelas")
    .select("numero_inicial, numero_final")
    .eq("id", lote_id)
    .single();

  if (!lote) {
    return { error: "Lote não encontrado." };
  }

  if (numero_inicial < lote.numero_inicial || numero_final > lote.numero_final) {
    return {
      error: `Baixa fora do intervalo reservado (${lote.numero_inicial}–${lote.numero_final}).`,
    };
  }

  const { data: existentes } = await supabase
    .from("baixas_cartelas")
    .select("numero_inicial, numero_final")
    .eq("lote_id", lote_id)
    .lte("numero_inicial", numero_final)
    .gte("numero_final", numero_inicial)
    .limit(1);

  if (existentes && existentes.length > 0) {
    return {
      error: `As cartelas ${existentes[0].numero_inicial}–${existentes[0].numero_final} já foram confirmadas neste lote.`,
    };
  }

  const { error } = await supabase.from("baixas_cartelas").insert({
    lote_id,
    numero_inicial,
    numero_final,
    forma_confirmacao,
  });

  if (error) {
    return { error: `Não foi possível confirmar a baixa: ${error.message}` };
  }

  revalidatePath("/admin/baixa");
  revalidatePath("/admin");
  return { success: true };
}

export async function baixarRestante(loteId: string) {
  const supabase = await createClient();

  const { data: lote } = await supabase
    .from("lotes_cartelas")
    .select("numero_inicial, numero_final")
    .eq("id", loteId)
    .single();
  if (!lote) throw new Error("Lote não encontrado.");

  const { data: baixas } = await supabase
    .from("baixas_cartelas")
    .select("numero_inicial, numero_final")
    .eq("lote_id", loteId);

  const gaps = computeGaps(
    lote.numero_inicial,
    lote.numero_final,
    (baixas ?? []).map((b) => ({ inicio: b.numero_inicial, fim: b.numero_final })),
  );

  if (gaps.length === 0) return;

  const { error } = await supabase.from("baixas_cartelas").insert(
    gaps.map((g) => ({
      lote_id: loteId,
      numero_inicial: g.inicio,
      numero_final: g.fim,
      forma_confirmacao: "pix" as const,
    })),
  );

  if (error) throw new Error(error.message);

  revalidatePath("/admin/baixa");
  revalidatePath("/admin");
}

export async function aprovarSolicitacao(solicitacaoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("aprovar_solicitacao", {
    p_solicitacao_id: solicitacaoId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/baixa");
  revalidatePath("/admin");
}

export async function rejeitarSolicitacao(solicitacaoId: string, motivo: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rejeitar_solicitacao", {
    p_solicitacao_id: solicitacaoId,
    p_motivo: motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/baixa");
}
