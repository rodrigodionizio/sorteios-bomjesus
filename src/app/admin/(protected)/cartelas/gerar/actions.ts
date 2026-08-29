"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gerarNumerosCartela, assinaturaCartela } from "@/lib/bingo";
import { findLoteSobreposto } from "@/lib/overlap";

export type GerarCartelasState = {
  error?: string;
  geradas?: number;
  puladas?: number;
};

/** PostgREST não gosta de payloads gigantes: milhares de cartelas vão em fatias. */
const TAMANHO_LOTE = 400;

/**
 * Gera as cartelas que **faltam** na faixa pedida.
 *
 * Nunca apaga nada: número que já existe é pulado. Isso torna a geração
 * repetível e incremental (gere 1–500 hoje, 501–1000 amanhã) e tira o
 * caminho destrutivo do botão que a coordenação mais usa. Para refazer
 * uma faixa, existe `apagarCartelas`, que tem guarda própria.
 */
export async function gerarCartelas(
  sorteioId: string,
  _prevState: GerarCartelasState,
  formData: FormData,
): Promise<GerarCartelasState> {
  const quadros = Number(formData.get("quadros"));
  const de = Number(formData.get("de"));
  const ate = Number(formData.get("ate"));

  if (!Number.isInteger(quadros) || quadros < 1 || quadros > 4) {
    return { error: "A cartela pode ter de 1 a 4 quadros." };
  }
  if (!Number.isInteger(de) || !Number.isInteger(ate) || ate < de) {
    return { error: "Informe uma faixa válida (o número final não pode ser menor que o inicial)." };
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

  if (de < sorteio.cartela_min || ate > sorteio.cartela_max) {
    return {
      error: `A faixa precisa ficar dentro das cartelas do sorteio (${sorteio.cartela_min}–${sorteio.cartela_max}). Para ampliar, edite o sorteio.`,
    };
  }

  const total = ate - de + 1;
  if (total > 5000) {
    return { error: `São ${total} cartelas de uma vez — gere em faixas menores.` };
  }

  // Todas as cartelas de um sorteio precisam ter o MESMO número de quadros:
  // quadros = quantos prêmios a cartela disputa, então uma leva com 3 e
  // outra com 2 daria a umas cartelas mais chances que a outras dentro do
  // mesmo sorteio. É injustiça silenciosa, não detalhe técnico.
  const { data: outraLeva } = await supabase
    .from("cartelas")
    .select("quadros")
    .eq("sorteio_id", sorteioId)
    .neq("quadros", quadros)
    .limit(1)
    .maybeSingle();

  if (outraLeva) {
    return {
      error: `Este sorteio já tem cartelas com ${outraLeva.quadros} quadro(s). Gerar com ${quadros} daria mais chances a umas cartelas que a outras — use ${outraLeva.quadros}, ou apague as existentes antes.`,
    };
  }

  // O que já existe nesta faixa é pulado, não sobrescrito.
  const { data: existentes } = await supabase
    .from("cartelas")
    .select("numero")
    .eq("sorteio_id", sorteioId)
    .gte("numero", de)
    .lte("numero", ate);

  const jaTem = new Set((existentes ?? []).map((c) => c.numero));

  const vistas = new Set<string>();
  const linhas: {
    sorteio_id: string;
    numero: number;
    numeros: number[];
    quadros: number;
    gerada_por: string | null;
  }[] = [];

  for (let numero = de; numero <= ate; numero++) {
    if (jaTem.has(numero)) continue;

    // Colisão exata de conjunto é improvável, mas conferir é barato.
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

  if (linhas.length === 0) {
    return { geradas: 0, puladas: jaTem.size };
  }

  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const fatia = linhas.slice(i, i + TAMANHO_LOTE);
    const { error } = await supabase.from("cartelas").insert(fatia);
    if (error) {
      return { error: `Falhou ao gravar a partir da cartela ${fatia[0].numero}: ${error.message}` };
    }
  }

  // `quadros` é quantos prêmios a cartela disputa — então ele é a fonte de
  // verdade de `premios_previstos`, que a apuração usa para saber quantas
  // apurações oferecer. Mantidos em sincronia aqui, no único lugar que
  // define os quadros.
  await supabase
    .from("sorteios")
    .update({ modalidade: "bingo", premios_previstos: quadros })
    .eq("id", sorteioId);

  // A geração não tem uma linha "dona" — são centenas de uma vez. Sem este
  // evento não há como responder depois quem gerou, quando e qual faixa.
  await supabase.from("eventos_auditoria").insert({
    acao: "cartelas.gerar",
    entidade: "sorteios",
    entidade_id: sorteioId,
    detalhes: { de, ate, quantidade: linhas.length, puladas: jaTem.size, quadros },
    realizado_por: user?.id ?? null,
  });

  revalidatePath("/admin/cartelas/gerar");
  revalidatePath("/admin/sorteios");
  return { geradas: linhas.length, puladas: jaTem.size };
}

export type ApagarCartelasState = {
  error?: string;
  apagadas?: number;
};

/**
 * Apaga as cartelas de uma faixa — o caminho para refazer uma geração.
 *
 * A guarda é o que importa: número já **distribuído** (dentro de um lote
 * ativo) não pode ser apagado. Aquela cartela está impressa e na mão de um
 * vendedor; apagá-la deixaria o papel sem contrapartida no sistema, e a
 * regeração daria outros números para a mesma cartela nº X.
 */
export async function apagarCartelas(
  sorteioId: string,
  _prevState: ApagarCartelasState,
  formData: FormData,
): Promise<ApagarCartelasState> {
  const de = Number(formData.get("de"));
  const ate = Number(formData.get("ate"));

  if (!Number.isInteger(de) || !Number.isInteger(ate) || ate < de) {
    return { error: "Informe uma faixa válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Lote ativo que cruze a faixa = cartela já distribuída. É a mesma
  // pergunta que `/admin/reservar` faz antes de gravar, então reaproveita a
  // mesma função em vez de repetir a consulta.
  const conflito = await findLoteSobreposto(supabase, sorteioId, de, ate);

  if (conflito) {
    const vendedor = conflito.vendedores?.nome;
    return {
      error: `As cartelas ${conflito.numero_inicial}–${conflito.numero_final} já foram reservadas${
        vendedor ? ` por ${vendedor}` : ""
      }. Cancele a reserva antes de apagar essa faixa.`,
    };
  }

  const { data: apagadas, error } = await supabase
    .from("cartelas")
    .delete()
    .eq("sorteio_id", sorteioId)
    .gte("numero", de)
    .lte("numero", ate)
    .select("numero");

  if (error) return { error: `Não foi possível apagar: ${error.message}` };

  await supabase.from("eventos_auditoria").insert({
    acao: "cartelas.apagar",
    entidade: "sorteios",
    entidade_id: sorteioId,
    detalhes: { de, ate, quantidade: apagadas?.length ?? 0 },
    realizado_por: user?.id ?? null,
  });

  revalidatePath("/admin/cartelas/gerar");
  return { apagadas: apagadas?.length ?? 0 };
}
