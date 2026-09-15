import { redirect } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * `/placar` sem id: manda para o sorteio ativo.
 *
 * Existe para que dê para imprimir "acesse …/placar" num cartaz sem precisar
 * do uuid do sorteio — e para que esse mesmo cartaz continue valendo no ano
 * seguinte, quando o sorteio ativo for outro.
 */
export const dynamic = "force-dynamic";

export default async function PlacarIndexPage() {
  const supabase = createPublicClient();

  const { data: sorteios } = await supabase
    .from("sorteios")
    .select("id, status")
    .order("created_at", { ascending: false });

  const alvo =
    (sorteios ?? []).find((s) => s.status === "em_andamento") ?? (sorteios ?? [])[0];

  // Sem sorteio nenhum, a landing já sabe explicar a situação.
  redirect(alvo ? `/placar/${alvo.id}` : "/");
}
