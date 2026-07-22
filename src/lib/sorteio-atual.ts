import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const COOKIE_NAME = "sorteio_ativo_id";

export const getSorteioAtual = cache(async function getSorteioAtual() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const preferredId = cookieStore.get(COOKIE_NAME)?.value;

  const { data: sorteios } = await supabase
    .from("sorteios")
    .select("*")
    .order("created_at", { ascending: false });

  if (!sorteios || sorteios.length === 0) {
    return { sorteios: [], atual: null };
  }

  const preferred = preferredId
    ? sorteios.find((s) => s.id === preferredId)
    : undefined;
  const emAndamento = sorteios.find((s) => s.status === "em_andamento");

  const atual = preferred ?? emAndamento ?? sorteios[0];

  return { sorteios, atual };
});

export { COOKIE_NAME as SORTEIO_COOKIE_NAME };
