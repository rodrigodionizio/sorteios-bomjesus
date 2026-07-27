"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loteSchema, loteUpdateSchema } from "@/lib/validations/lote";
import { findLoteSobreposto } from "@/lib/overlap";

export type LoteFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function createLote(
  sorteioId: string,
  _prevState: LoteFormState,
  formData: FormData,
): Promise<LoteFormState> {
  const parsed = loteSchema.safeParse({
    vendedor_id: formData.get("vendedor_id"),
    tipo: formData.get("tipo"),
    numero_inicial: formData.get("numero_inicial"),
    numero_final: formData.get("numero_final"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const { vendedor_id, tipo, numero_inicial, numero_final } = parsed.data;
  const supabase = await createClient();

  const conflito = await findLoteSobreposto(
    supabase,
    sorteioId,
    numero_inicial,
    numero_final,
  );
  if (conflito) {
    return {
      error: `Cartelas ${conflito.numero_inicial}–${conflito.numero_final} já pertencem a ${conflito.vendedores?.nome ?? "outro vendedor"} neste sorteio.`,
    };
  }

  const { error } = await supabase.from("lotes_cartelas").insert({
    sorteio_id: sorteioId,
    vendedor_id,
    tipo,
    numero_inicial,
    numero_final,
  });

  if (error) {
    if (error.code === "23P01") {
      return {
        error:
          "Esse intervalo acabou de ser reservado por outra pessoa. Atualize a página e tente novamente.",
      };
    }
    return { error: `Não foi possível reservar: ${error.message}` };
  }

  revalidatePath("/admin/reservar");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateLote(
  loteId: string,
  _prevState: LoteFormState,
  formData: FormData,
): Promise<LoteFormState> {
  const parsed = loteUpdateSchema.safeParse({
    tipo: formData.get("tipo"),
    numero_inicial: formData.get("numero_inicial"),
    numero_final: formData.get("numero_final"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const { tipo, numero_inicial, numero_final } = parsed.data;
  const supabase = await createClient();

  const { data: lote } = await supabase
    .from("lotes_cartelas")
    .select("sorteio_id")
    .eq("id", loteId)
    .single();

  if (!lote) {
    return { error: "Lote não encontrado." };
  }

  const { data: baixas } = await supabase
    .from("baixas_cartelas")
    .select("numero_inicial, numero_final")
    .eq("lote_id", loteId);

  const foraDoNovoIntervalo = (baixas ?? []).find(
    (b) => b.numero_inicial < numero_inicial || b.numero_final > numero_final,
  );
  if (foraDoNovoIntervalo) {
    return {
      error: `Já existe uma baixa confirmada (${foraDoNovoIntervalo.numero_inicial}–${foraDoNovoIntervalo.numero_final}) fora do novo intervalo. Ajuste o intervalo para incluí-la, ou corrija a baixa primeiro.`,
    };
  }

  const conflito = await findLoteSobreposto(
    supabase,
    lote.sorteio_id,
    numero_inicial,
    numero_final,
    loteId,
  );
  if (conflito) {
    return {
      error: `Cartelas ${conflito.numero_inicial}–${conflito.numero_final} já pertencem a ${conflito.vendedores?.nome ?? "outro vendedor"} neste sorteio.`,
    };
  }

  const { error } = await supabase
    .from("lotes_cartelas")
    .update({ tipo, numero_inicial, numero_final })
    .eq("id", loteId);

  if (error) {
    if (error.code === "23P01") {
      return {
        error:
          "Esse intervalo acabou de ser reservado por outra pessoa. Atualize a página e tente novamente.",
      };
    }
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/admin/reservar");
  revalidatePath("/admin/baixa");
  revalidatePath("/admin");
  return { success: true };
}
