"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gerarNumerosCartela, assinaturaCartela } from "@/lib/bingo";

export type GerarCartelasState = {
  error?: string;
  geradas?: number;
};

/** PostgREST não gosta de payloads gigantes: 1.500 cartelas vão em fatias. */
const TAMANHO_LOTE = 400;

export async function gerarCartelas(
  sorteioId: string,
  _prevState: GerarCartelasState,
  formData: FormData,
): Promise<GerarCartelasState> {
  const quadros = Number(formData.get("quadros"));
  const confirmouRegerar = formData.get("confirmar_regeracao") === "on";

  if (!Number.isInteger(quadros) || quadros < 1 || quadros > 4) {
    return { error: "A cartela pode ter de 1 a 4 quadros." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sorteio } = await supabase
    .from("sorteios")
    .select("id, cartela_min, cartela_max, modalidade")
    .eq("id", sorteioId)
    .single();

  if (!sorteio) return { error: "Sorteio não encontrado." };

  const { count: jaExistem } = await supabase
    .from("cartelas")
    .select("id", { count: "exact", head: true })
    .eq("sorteio_id", sorteioId);

  if ((jaExistem ?? 0) > 0) {
    if (!confirmouRegerar) {
      return {
        error: `Este sorteio já tem ${jaExistem} cartelas geradas. Marque a confirmação para apagar e gerar de novo.`,
      };
    }
    // Regerar troca a numeração de cartelas que podem já estar impressas e
    // na mão de vendedores — por isso exige confirmação explícita e fica
    // registrado na auditoria.
    const { error: erroDelete } = await supabase
      .from("cartelas")
      .delete()
      .eq("sorteio_id", sorteioId);
    if (erroDelete) {
      return { error: `Não foi possível apagar as cartelas anteriores: ${erroDelete.message}` };
    }
  }

  const total = sorteio.cartela_max - sorteio.cartela_min + 1;
  if (total > 5000) {
    return { error: `A faixa tem ${total} cartelas — gere em um sorteio com faixa menor.` };
  }

  // Colisão exata entre duas cartelas é improvável, mas conferir é barato.
  const vistas = new Set<string>();
  const linhas: { sorteio_id: string; numero: number; numeros: number[]; quadros: number; gerada_por: string | null }[] = [];

  for (let numero = sorteio.cartela_min; numero <= sorteio.cartela_max; numero++) {
    let numeros = gerarNumerosCartela();
    let tentativas = 0;
    while (vistas.has(assinaturaCartela(numeros)) && tentativas < 10) {
      numeros = gerarNumerosCartela();
      tentativas++;
    }
    vistas.add(assinaturaCartela(numeros));
    linhas.push({
      sorteio_id: sorteioId,
      numero,
      numeros,
      quadros,
      gerada_por: user?.id ?? null,
    });
  }

  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const fatia = linhas.slice(i, i + TAMANHO_LOTE);
    const { error } = await supabase.from("cartelas").insert(fatia);
    if (error) {
      return {
        error: `Falhou ao gravar a partir da cartela ${fatia[0].numero}: ${error.message}`,
      };
    }
  }

  if (sorteio.modalidade !== "bingo") {
    await supabase.from("sorteios").update({ modalidade: "bingo" }).eq("id", sorteioId);
  }

  // A geração não tem uma linha "dona" — são centenas de uma vez. Sem este
  // evento não há como responder depois quem gerou, quando e com que faixa.
  await supabase.from("eventos_auditoria").insert({
    acao: "cartelas.gerar",
    entidade: "sorteios",
    entidade_id: sorteioId,
    detalhes: {
      cartela_min: sorteio.cartela_min,
      cartela_max: sorteio.cartela_max,
      quantidade: linhas.length,
      quadros,
      regeracao: (jaExistem ?? 0) > 0,
    },
    realizado_por: user?.id ?? null,
  });

  revalidatePath("/admin/cartelas/gerar");
  revalidatePath("/admin/sorteios");
  return { geradas: linhas.length };
}
