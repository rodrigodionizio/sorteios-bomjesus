import type { Premio } from "@/lib/premios";

/** Uma linha de `vw_resultado_publico` — uma por número sorteado. */
export type ResultadoPublico = {
  sorteio_id: string;
  ordem: number;
  numero_sorteado: number;
  cartela_confirmada: boolean;
  nome_comprador: string | null;
  vendedor_premiado_nome: string | null;
  maior_vendedor_nome: string | null;
};

/**
 * Um cartão da tela de resultado. Há dois tipos, porque há duas famílias de
 * prêmio (ver a migration 14): o do número sorteado, que tem cartela,
 * comprador e vendedor; e o de venda, que só tem o vendedor.
 */
export type Premiado =
  | {
      tipo: "cartela";
      chave: string;
      rotulo: string;
      titulo: string | null;
      numero: number;
      comprador: string | null;
      vendedor: string | null;
      /** Sem baixa registrada, o vendedor é quem RESERVOU a faixa. */
      vendaConfirmada: boolean;
    }
  | {
      tipo: "venda";
      chave: string;
      rotulo: string;
      titulo: string | null;
      vendedor: string | null;
      /** Só existe para o prêmio de quem vendeu a cartela premiada. */
      vendaConfirmada: boolean | null;
    };

/**
 * Casa a premiação cadastrada com o que a apuração registrou.
 *
 * COMO O CASAMENTO É FEITO — e por que não é por `ordem`:
 * `premios_sorteio.ordem` é posição de EXIBIÇÃO, contada entre todas as
 * categorias. No sorteio de 2026 os prêmios de vendedor foram cadastrados
 * primeiro e ocupam as ordens 1 e 2; os de cartela sorteada vêm depois.
 * Comparar `premio.ordem` com `resultado.ordem` ligaria o 1º número sorteado
 * à moto. O casamento correto é por POSIÇÃO dentro da categoria: o k-ésimo
 * prêmio `cartela_sorteada` é o do k-ésimo número sorteado.
 *
 * (O comentário da coluna `ordem` na migration 14 diz que as duas ordens
 * coincidem. Não coincidem — e a migration já aplicada não é editada.)
 *
 * Sorteio sem premiação cadastrada continua funcionando: os cartões saem com
 * rótulo genérico ("1º prêmio", "Maior vendedor(a)").
 */
export function montarPremiados(
  resultados: ResultadoPublico[],
  premios: Premio[],
): Premiado[] {
  const apurados = [...resultados].sort((a, b) => a.ordem - b.ordem);
  if (apurados.length === 0) return [];

  const porCategoria = (categoria: Premio["categoria"]) =>
    premios.filter((p) => p.categoria === categoria).sort((a, b) => a.ordem - b.ordem);

  const deCartela = porCategoria("cartela_sorteada");
  // O maior vendedor e o vendedor da cartela premiada são gravados só na
  // linha do 1º prêmio — são do sorteio, não da sequência de números.
  const primeiro = apurados[0];

  const cartelas: Premiado[] = apurados.map((r, i) => ({
    tipo: "cartela",
    chave: `cartela-${r.ordem}`,
    rotulo:
      apurados.length > 1 ? `${r.ordem}º prêmio · cartela sorteada` : "Cartela sorteada",
    titulo: deCartela[i]?.titulo ?? null,
    numero: r.numero_sorteado,
    comprador: r.nome_comprador,
    vendedor: r.vendedor_premiado_nome,
    vendaConfirmada: r.cartela_confirmada,
  }));

  const maiorVendedor = porCategoria("maior_vendedor");
  const vendas: Premiado[] = (
    maiorVendedor.length > 0 ? maiorVendedor : [null]
  )
    // Sem prêmio cadastrado E sem nome registrado, não há o que mostrar.
    .filter((p) => p !== null || primeiro.maior_vendedor_nome !== null)
    .map((p, i) => ({
      tipo: "venda",
      chave: `maior-vendedor-${i}`,
      rotulo: "Maior vendedor(a)",
      // "2 × R$ 2.000" num cartão com UM nome sugeriria que a pessoa levou
      // os dois. A apuração guarda um só maior vendedor — ver a lacuna
      // registrada em 17-proposta-evolucao-2026.md.
      titulo: p?.titulo ?? null,
      vendedor: primeiro.maior_vendedor_nome,
      vendaConfirmada: null,
    }));

  for (const p of porCategoria("vendedor_cartela_premiada")) {
    vendas.push({
      tipo: "venda",
      chave: `vendedor-cartela-${p.id}`,
      rotulo: "Vendeu a cartela premiada",
      titulo: p.titulo,
      vendedor: primeiro.vendedor_premiado_nome,
      vendaConfirmada: primeiro.cartela_confirmada,
    });
  }

  return [...cartelas, ...vendas];
}

/**
 * Número da cartela com zeros à esquerda na largura do maior número do
 * sorteio — "0327" num sorteio de 4.000 cartelas. É como o número aparece
 * impresso, e é assim que a pessoa vai procurar na própria cartela.
 */
export function formatarNumeroCartela(numero: number, cartelaMax: number) {
  return String(numero).padStart(String(cartelaMax).length, "0");
}
