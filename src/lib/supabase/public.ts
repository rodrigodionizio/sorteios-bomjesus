import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Cliente para páginas PÚBLICAS que podem ser cacheadas.
 *
 * O `createClient` de `./server` lê `cookies()` para manter a sessão. Isso é
 * indispensável em qualquer tela autenticada — e é também o que torna a rota
 * dinâmica: bastou `await cookies()` para o Next passar a renderizar aquela
 * página a cada requisição, e `export const revalidate` deixa de ter efeito.
 *
 * A landing e o placar não têm sessão nenhuma: leem só dado público, com a
 * chave anônima, sob a mesma RLS de sempre. Sem cookie, eles voltam a ser
 * cacheáveis (ISR) — que é o que permite a home aguentar o pico da noite do
 * sorteio sem uma consulta ao banco por visitante.
 *
 * `persistSession: false` porque não há onde persistir no servidor, e
 * persistir sessão num cliente compartilhado entre requisições seria
 * exatamente o tipo de vazamento entre usuários que não se quer.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
