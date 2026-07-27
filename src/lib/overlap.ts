import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Finds an active lote in the same sorteio whose range overlaps [inicial, final].
 * Mirrors the `lotes_sem_sobreposicao` exclusion constraint so the UI can show
 * a specific, friendly conflict message before ever hitting the database error.
 */
export async function findLoteSobreposto(
  supabase: SupabaseClient<Database>,
  sorteioId: string,
  numeroInicial: number,
  numeroFinal: number,
  excludeLoteId?: string,
) {
  let query = supabase
    .from("lotes_cartelas")
    .select("numero_inicial, numero_final, vendedores(nome)")
    .eq("sorteio_id", sorteioId)
    .eq("status", "ativo")
    .lte("numero_inicial", numeroFinal)
    .gte("numero_final", numeroInicial);

  if (excludeLoteId) {
    query = query.neq("id", excludeLoteId);
  }

  const { data } = await query.limit(1).maybeSingle();

  return data as
    | {
        numero_inicial: number;
        numero_final: number;
        vendedores: { nome: string } | null;
      }
    | null;
}
