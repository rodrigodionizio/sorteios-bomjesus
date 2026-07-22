"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ApuracaoState = {
  error?: string;
};

export async function apurarSorteio(
  sorteioId: string,
  _prevState: ApuracaoState,
  formData: FormData,
): Promise<ApuracaoState> {
  const numero = Number(formData.get("numero_sorteado"));
  if (!Number.isInteger(numero) || numero < 1) {
    return { error: "Informe um número de cartela válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_registrar_resultado_sorteio", {
    p_sorteio_id: sorteioId,
    p_numero_sorteado: numero,
  });

  if (error) {
    return { error: `Não foi possível apurar: ${error.message}` };
  }

  revalidatePath("/admin/apuracao");
  revalidatePath("/admin");
  revalidatePath("/admin/sorteios");
  return {};
}
