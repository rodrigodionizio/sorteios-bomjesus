"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ApuracaoState = {
  error?: string;
};

/**
 * Apura UM PRÊMIO: registra o número sorteado para aquele prêmio.
 *
 * Toda regra mora em `fn_apurar_premio` (migration 16) — inclusive a
 * recusa quando o sorteio não tem prêmio principal e a correção de um
 * número já apurado. A escrita direta em `resultados_sorteio` foi revogada:
 * não existe outro caminho.
 */
export async function apurarPremio(
  sorteioId: string,
  premioId: string,
  _prevState: ApuracaoState,
  formData: FormData,
): Promise<ApuracaoState> {
  const numero = Number(formData.get("numero_sorteado"));
  if (!Number.isInteger(numero) || numero < 1) {
    return { error: "Informe um número de cartela válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_apurar_premio", {
    p_premio_id: premioId,
    p_numero_sorteado: numero,
  });

  if (error) {
    return { error: `Não foi possível apurar: ${error.message}` };
  }

  revalidatePath("/admin/apuracao");
  revalidatePath("/admin");
  revalidatePath("/admin/sorteios");
  revalidatePath(`/admin/sorteios/${sorteioId}/premios`);
  // A home é ISR (5 min) e mostra a faixa de resultado. Sem isto, o número
  // apurado levaria até 5 minutos para aparecer lá.
  revalidatePath("/");
  revalidatePath(`/placar/${sorteioId}`);
  return {};
}
