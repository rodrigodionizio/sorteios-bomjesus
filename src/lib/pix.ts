/**
 * Montagem do BR Code (Pix "copia e cola"), no padrão EMV do Banco Central.
 *
 * Função pura, sem banco e sem rede — mesmo espírito de `gaps.ts` e
 * `overlap.ts`: a regra fica testável isoladamente, e quem monta o payload
 * nunca depende de quem o renderiza.
 *
 * DECISÃO: o QR da cartela sai **sem valor** (campo 54 ausente). Quem paga
 * digita o total, para conseguir levar várias cartelas num pagamento só.
 * Por isso `valor` é opcional aqui — existe para um uso futuro (uma fatura,
 * por exemplo), não para a cartela.
 */

/** Campos do EMV usados aqui. Os números são os do padrão, não arbitrários. */
const ID_PAYLOAD_FORMAT = "00";
const ID_MERCHANT_ACCOUNT = "26";
const ID_MERCHANT_CATEGORY = "52";
const ID_CURRENCY = "53";
const ID_VALOR = "54";
const ID_PAIS = "58";
const ID_NOME = "59";
const ID_CIDADE = "60";
const ID_ADICIONAL = "62";
const ID_CRC = "63";

const GUI_PIX = "br.gov.bcb.pix";

/** `id + tamanho(2 dígitos) + valor` — a unidade de montagem do EMV. */
function tlv(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/**
 * Tira acento, força maiúsculas e remove o que o padrão não aceita.
 * Campos 59/60 chegam ao app de quem paga, então caractere estranho ali
 * vira sujeira visível — ou recusa do aplicativo.
 */
function normalizarTexto(valor: string, tamanhoMax: number): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira os acentos separados pelo NFD
    .toUpperCase()
    .replace(/[^A-Z0-9 .-]/g, "") // sobra só o que o padrão aceita
    .trim()
    .slice(0, tamanhoMax);
}

/**
 * O txid (campo 62-05) aceita SOMENTE [A-Za-z0-9], no máximo 25 caracteres.
 * Hífen, espaço e acento invalidam o QR em parte dos aplicativos de banco —
 * e o erro só aparece quando o comprador tenta pagar. Por isso a mensagem
 * amigável ("BINGO-26") e o txid ("BINGO26") são coisas separadas: guarde a
 * primeira para mostrar, normalize para a segunda ao montar o QR.
 */
export function montarTxid(prefixo: string | null | undefined, sufixo?: string | number): string {
  const limpo = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // acentos
      .replace(/[^A-Za-z0-9]/g, ""); // o txid não aceita mais nada
  const base = limpo(prefixo ?? "");
  const cauda = sufixo === undefined ? "" : limpo(String(sufixo));
  const txid = `${base}${cauda}`.slice(0, 25);
  // O padrão exige algo no campo; "***" é o coringa aceito para "sem
  // identificador", usado quando não há mensagem cadastrada.
  return txid.length > 0 ? txid : "***";
}

/**
 * CRC16/CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF), calculado sobre o
 * payload inteiro já com "6304" no fim. É o último campo do BR Code, e é o
 * que faz o aplicativo aceitar ou recusar o QR.
 */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type BrCodeInput = {
  chave: string;
  nomeRecebedor: string;
  cidade: string;
  txid?: string;
  /** Em reais. Omitido na cartela de propósito — ver o cabeçalho. */
  valor?: number;
};

export function montarBrCode({
  chave,
  nomeRecebedor,
  cidade,
  txid,
  valor,
}: BrCodeInput): string {
  const conta = tlv("00", GUI_PIX) + tlv("01", chave.trim());
  const identificador = tlv("05", montarTxid(txid ?? null));

  let payload =
    tlv(ID_PAYLOAD_FORMAT, "01") +
    tlv(ID_MERCHANT_ACCOUNT, conta) +
    tlv(ID_MERCHANT_CATEGORY, "0000") +
    tlv(ID_CURRENCY, "986");

  if (typeof valor === "number" && valor > 0) {
    payload += tlv(ID_VALOR, valor.toFixed(2));
  }

  payload +=
    tlv(ID_PAIS, "BR") +
    tlv(ID_NOME, normalizarTexto(nomeRecebedor, 25)) +
    tlv(ID_CIDADE, normalizarTexto(cidade, 15)) +
    tlv(ID_ADICIONAL, identificador);

  const comCrc = `${payload}${ID_CRC}04`;
  return `${comCrc}${crc16(comCrc)}`;
}

/** Rótulo de cada tipo de chave, para a tela de cadastro. */
export const TIPOS_CHAVE_PIX = [
  { valor: "aleatoria", rotulo: "Aleatória (EVP)" },
  { valor: "cnpj", rotulo: "CNPJ" },
  { valor: "email", rotulo: "E-mail" },
  { valor: "telefone", rotulo: "Telefone" },
  { valor: "cpf", rotulo: "CPF" },
] as const;
