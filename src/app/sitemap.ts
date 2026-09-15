import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * O sitemap listava só a raiz — que, na época, era o placar. Com a landing na
 * raiz e um placar por sorteio, cada sorteio precisa da própria entrada:
 * é ela que faz o buscador indexar "Sorteio Bom Jesus 2026" com título e
 * descrição próprios, em vez de uma página só que muda de conteúdo.
 *
 * Revalidado junto com a landing — não faz sentido o sitemap ser mais
 * fresco que o conteúdo que ele anuncia.
 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const { data: sorteios } = await supabase
    .from("sorteios")
    .select("id, status, created_at")
    .order("created_at", { ascending: false });

  const agora = new Date();

  const rotasDeSorteio: MetadataRoute.Sitemap = (sorteios ?? []).map((s) => ({
    url: `${SITE_URL}/placar/${s.id}`,
    lastModified: agora,
    // Sorteio ativo muda o tempo todo; encerrado é documento parado.
    changeFrequency: s.status === "em_andamento" ? "hourly" : "yearly",
    priority: s.status === "em_andamento" ? 0.9 : 0.4,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: agora,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/verificar`,
      lastModified: agora,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...rotasDeSorteio,
  ];
}
