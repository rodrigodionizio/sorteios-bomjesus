export type CategoriaPremio =
  | "cartela_sorteada"
  | "maior_vendedor"
  | "vendedor_cartela_premiada"
  | "outro";

export type Premio = {
  id: string;
  sorteio_id: string;
  ordem: number;
  categoria: CategoriaPremio;
  titulo: string;
  descricao: string | null;
  valor: number | null;
  quantidade: number;
  exibir_publico: boolean;
};

/**
 * A quem o prêmio vai. É o eixo que faltava: `sorteios.premios_previstos`
 * conta só os prêmios do comprador (os que dependem de um número sorteado),
 * e por isso a premiação de vendedor — os R$ 2.000 e a moto de 2026 — nunca
 * coube nele. Ver a migration 14.
 */
export const DESTINATARIO: Record<CategoriaPremio, "comprador" | "vendedor"> = {
  cartela_sorteada: "comprador",
  maior_vendedor: "vendedor",
  vendedor_cartela_premiada: "vendedor",
  outro: "comprador",
};

export const ROTULO_CATEGORIA: Record<CategoriaPremio, string> = {
  cartela_sorteada: "Cartela sorteada",
  maior_vendedor: "Maior vendedor(a)",
  vendedor_cartela_premiada: "Quem vendeu a cartela premiada",
  outro: "Outro",
};

/** Frase de vitrine, para o público. O rótulo curto acima é para o painel. */
export const DESCRICAO_CATEGORIA: Record<CategoriaPremio, string> = {
  cartela_sorteada: "para quem comprou a cartela sorteada",
  maior_vendedor: "para quem mais vender cartelas",
  vendedor_cartela_premiada: "para quem vender a cartela sorteada",
  outro: "",
};

export const CATEGORIAS: CategoriaPremio[] = [
  "cartela_sorteada",
  "maior_vendedor",
  "vendedor_cartela_premiada",
  "outro",
];

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * "2 × R$ 2.000 em dinheiro" / "Uma moto 0km".
 *
 * A quantidade só aparece quando é maior que 1 — dois prêmios iguais são
 * UMA linha com `quantidade = 2`, que foi como a paróquia descreveu a
 * premiação de 2026.
 */
export function rotuloPremio(premio: Pick<Premio, "titulo" | "quantidade">) {
  return premio.quantidade > 1
    ? `${premio.quantidade} × ${premio.titulo}`
    : premio.titulo;
}

/** Valor total representado pelo prêmio, quando ele tem valor declarado. */
export function valorTotal(premio: Pick<Premio, "valor" | "quantidade">) {
  return premio.valor === null ? null : MOEDA.format(premio.valor * premio.quantidade);
}

export function formatarValor(valor: number) {
  return MOEDA.format(valor);
}
