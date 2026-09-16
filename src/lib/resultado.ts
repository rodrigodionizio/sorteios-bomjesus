import type { Database } from "@/lib/types/database";
import type { Premio } from "@/lib/premios";

/** Uma linha de `vw_premiados_publico` — um prêmio público, vencedor já resolvido. */
export type PremiadoPublico = Database["public"]["Views"]["vw_premiados_publico"]["Row"];

/**
 * Um cartão da tela de resultado. Há dois tipos porque há duas famílias de
 * prêmio: o de cartela sorteada, que tem número, comprador e vendedor; e o
 * de venda, que só tem o vendedor.
 */
export type Premiado =
  | {
      tipo: "cartela";
      chave: string;
      rotulo: string;
      titulo: string;
      principal: boolean;
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
      titulo: string;
      vendedor: string | null;
      vendaConfirmada: boolean | null;
    };

const ROTULO_VENDA: Partial<Record<PremiadoPublico["categoria"], string>> = {
  maior_vendedor: "Maior vendedor(a)",
  vendedor_cartela_premiada: "Vendeu a cartela do prêmio principal",
};

const principalPrimeiro = (a: PremiadoPublico, b: PremiadoPublico) =>
  Number(b.principal) - Number(a.principal) || a.ordem - b.ordem;

/**
 * Converte as linhas da view em cartões. **Não decide vencedor nenhum.**
 *
 * Quem ganhou cada prêmio — inclusive que o prêmio de quem vendeu a cartela
 * premiada vai para o vendedor da cartela do PRÊMIO PRINCIPAL — é resolvido
 * em SQL, em `vw_premiados_publico` (migration 16). Aqui só se escolhe o que
 * exibir (o que já foi apurado) e em que ordem (principal primeiro).
 *
 * Uma versão anterior casava prêmio com número pela posição na lista e
 * escolhia sozinha o 1º número apurado para o prêmio do vendedor. Era regra
 * de negócio morando no front, e nem tinha sido definida pela coordenação.
 */
export function montarPremiados(linhas: PremiadoPublico[]): Premiado[] {
  const apurados = linhas.filter((l) => l.apurado);

  const cartelas: Premiado[] = apurados
    .filter((l) => l.categoria === "cartela_sorteada" && l.numero_sorteado !== null)
    .sort(principalPrimeiro)
    .map((l) => ({
      tipo: "cartela",
      chave: l.premio_id,
      rotulo: l.principal ? "Prêmio principal" : "Cartela sorteada",
      titulo: l.titulo,
      principal: l.principal,
      numero: l.numero_sorteado as number,
      comprador: l.nome_comprador,
      vendedor: l.vendedor_nome,
      vendaConfirmada: l.venda_confirmada ?? false,
    }));

  const vendas: Premiado[] = apurados
    .filter((l) => ROTULO_VENDA[l.categoria] !== undefined)
    .sort((a, b) => a.ordem - b.ordem)
    .map((l) => ({
      tipo: "venda",
      chave: l.premio_id,
      rotulo: ROTULO_VENDA[l.categoria] as string,
      titulo: l.titulo,
      vendedor: l.vendedor_nome,
      vendaConfirmada: l.venda_confirmada,
    }));

  return [...cartelas, ...vendas];
}

/** A premiação anunciada, das mesmas linhas — para a lista descritiva. */
export function premiosDasLinhas(linhas: PremiadoPublico[]): Premio[] {
  return [...linhas].sort(principalPrimeiro).map((l) => ({
    id: l.premio_id,
    sorteio_id: l.sorteio_id,
    ordem: l.ordem,
    categoria: l.categoria,
    titulo: l.titulo,
    descricao: l.descricao,
    valor: l.valor,
    quantidade: l.quantidade,
    exibir_publico: true,
    principal: l.principal,
  }));
}

/**
 * Número da cartela com zeros à esquerda na largura do maior número do
 * sorteio — "0327" num sorteio de 4.000 cartelas. É como o número aparece
 * impresso, e é assim que a pessoa vai procurar na própria cartela.
 */
export function formatarNumeroCartela(numero: number, cartelaMax: number) {
  return String(numero).padStart(String(cartelaMax).length, "0");
}
