"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ApuracaoState = {
  error?: string;
};

export async function apurarSorteio(
  sorteioId: string,
  ordem: number,
  _prevState: ApuracaoState,
  formData: FormData,
): Promise<ApuracaoState> {
  const numero = Number(formData.get("numero_sorteado"));
  if (!Number.isInteger(numero) || numero < 1) {
    return { error: "Informe um número de cartela válido." };
  }

  const supabase = await createClient();
  // `p_ordem` diz qual prêmio está sendo apurado. Sem ele, o banco assume 1
  // — e o 2º prêmio sobrescreveria o 1º.
  const { error } = await supabase.rpc("fn_registrar_resultado_sorteio", {
    p_sorteio_id: sorteioId,
    p_numero_sorteado: numero,
    p_ordem: ordem,
  });

  if (error) {
    return { error: `Não foi possível apurar: ${error.message}` };
  }

  revalidatePath("/admin/apuracao");
  revalidatePath("/admin");
  revalidatePath("/admin/sorteios");
  // A home é ISR (5 min) e mostra a faixa de resultado. Sem isto, o número
  // apurado levaria até 5 minutos para aparecer lá.
  revalidatePath("/");
  revalidatePath(`/placar/${sorteioId}`);
  return {};
}
