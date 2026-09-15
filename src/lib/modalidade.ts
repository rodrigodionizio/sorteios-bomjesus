export type Modalidade = "rifa" | "bingo";

/**
 * Como a modalidade é chamada NAS PÁGINAS PÚBLICAS.
 *
 * A palavra "bingo" tem peso regulatório no Brasil — exploração de bingo é
 * atividade regulada, e uma campanha paroquial não é isso. Fora do painel,
 * portanto, o sistema usa os nomes que a própria comunidade já usa:
 *
 *   rifa  → "Ação entre amigos"
 *   bingo → "Show de prêmios"
 *
 * O valor gravado no banco (`sorteios.modalidade`) continua `'rifa'` /
 * `'bingo'`: trocar o enum exigiria migrar dado e reescrever a migration 12
 * sem ganho nenhum — o termo técnico não aparece para o público, e é o que
 * a documentação inteira usa. O que muda é só a etiqueta na tela.
 *
 * O sorteio de produção, aliás, já se chama "Show de Prêmios da Bom Jesus
 * 2026" — a linguagem pública já vinha por esse caminho.
 */
export const ROTULO_MODALIDADE_PUBLICO: Record<Modalidade, string> = {
  rifa: "Ação entre amigos",
  bingo: "Show de prêmios",
};

/** No painel administrativo o termo técnico é útil e não tem risco. */
export const ROTULO_MODALIDADE_ADMIN: Record<Modalidade, string> = {
  rifa: "Rifa",
  bingo: "Bingo",
};

export function rotuloModalidadePublico(modalidade: Modalidade | null | undefined) {
  return ROTULO_MODALIDADE_PUBLICO[modalidade ?? "rifa"];
}
