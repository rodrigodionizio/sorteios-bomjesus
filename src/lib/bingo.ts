/**
 * Geração do conteúdo de uma cartela de bingo — grade clássica de 75 bolas.
 *
 * Função pura, sem banco: mesma disciplina de `gaps.ts` e `overlap.ts`.
 * Quem decide o que vai para o banco é a Server Action; aqui só existe a
 * regra do jogo.
 */

/** Faixa de cada coluna e quantos números ela carrega. */
export const COLUNAS_BINGO = [
  { letra: "B", min: 1, max: 15, quantidade: 5 },
  { letra: "I", min: 16, max: 30, quantidade: 5 },
  // 4, não 5: a casa central é o espaço livre — nunca é uma dezena sorteável
  { letra: "N", min: 31, max: 45, quantidade: 4 },
  { letra: "G", min: 46, max: 60, quantidade: 5 },
  { letra: "O", min: 61, max: 75, quantidade: 5 },
] as const;

export const NUMEROS_POR_CARTELA = 24;

/**
 * `n` números distintos de [min, max], em ordem crescente.
 *
 * Usa `crypto.getRandomValues` em vez de `Math.random()`. Numa cartela
 * isolada daria no mesmo, mas 1.500 cartelas geradas em sequência a partir
 * de um gerador previsível seriam, em princípio, reproduzíveis por quem
 * soubesse o instante da geração — e a lisura do jogo é o produto aqui.
 */
export function amostra(min: number, max: number, n: number): number[] {
  const pool: number[] = [];
  for (let i = min; i <= max; i++) pool.push(i);

  // Fisher-Yates com índice sorteado por crypto
  for (let i = pool.length - 1; i > 0; i--) {
    const j = inteiroAleatorio(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, n).sort((a, b) => a - b);
}

/** Inteiro uniforme em [0, limite), sem o viés do resto da divisão. */
function inteiroAleatorio(limite: number): number {
  const maximoSemVies = Math.floor(0xffffffff / limite) * limite;
  const buffer = new Uint32Array(1);
  let valor: number;
  do {
    crypto.getRandomValues(buffer);
    valor = buffer[0];
  } while (valor >= maximoSemVies);
  return valor % limite;
}

/**
 * As 24 dezenas de uma cartela, na ordem fixa das colunas B-I-N-G-O.
 *
 * A posição no array já define a posição na grade (índices 1–5 = coluna B,
 * 6–10 = I, 11–14 = N, 15–19 = G, 20–24 = O), e é por isso que a tabela
 * `cartelas` não precisa de nenhuma coluna de layout.
 */
export function gerarNumerosCartela(): number[] {
  return COLUNAS_BINGO.flatMap((c) => amostra(c.min, c.max, c.quantidade));
}

/**
 * Reorganiza o array de 24 números na grade 5×5 que vai impressa, com
 * `null` na casa central (onde entra a marca do sistema).
 *
 * Devolve linhas, não colunas — é o que o `<table>` precisa.
 */
export function gradeDaCartela(numeros: number[]): (number | null)[][] {
  const colunas: number[][] = [];
  let cursor = 0;
  for (const coluna of COLUNAS_BINGO) {
    colunas.push(numeros.slice(cursor, cursor + coluna.quantidade));
    cursor += coluna.quantidade;
  }

  const linhas: (number | null)[][] = [];
  for (let linha = 0; linha < 5; linha++) {
    const atual: (number | null)[] = [];
    for (let col = 0; col < 5; col++) {
      const ehCentro = col === 2 && linha === 2;
      if (ehCentro) {
        atual.push(null);
        continue;
      }
      // na coluna do meio, as linhas abaixo do centro andam um índice para
      // trás, porque aquela coluna tem 4 números e não 5
      const indice = col === 2 && linha > 2 ? linha - 1 : linha;
      atual.push(colunas[col][indice]);
    }
    linhas.push(atual);
  }
  return linhas;
}

/** Chave de comparação para detectar duas cartelas com o conjunto idêntico. */
export function assinaturaCartela(numeros: number[]): string {
  return numeros.join(",");
}
