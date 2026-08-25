import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatInt } from "@/lib/format";
import { gradeDaCartela } from "@/lib/bingo";
import { montarBrCode, montarTxid } from "@/lib/pix";
import { PrintButton } from "../../relatorio/print-button";
import { CARTELA_CSS } from "./cartela-styles";

/** Quantas folhas por carregamento — 1.500 QRs de uma vez travaria o navegador. */
const POR_PAGINA = 40;

const ORDINAIS = ["1º", "2º", "3º", "4º"];

export default async function ImprimirCartelasPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const { de, ate } = await searchParams;
  const supabase = await createClient();
  const { atual } = await getSorteioAtual();

  if (!atual) return <p className="text-muted-foreground">Nenhum sorteio cadastrado.</p>;

  const inicio = Number(de) || atual.cartela_min;
  const fim = Number(ate) || Math.min(inicio + POR_PAGINA - 1, atual.cartela_max);

  const [{ data: cartelas }, { data: chave }] = await Promise.all([
    supabase
      .from("cartelas")
      .select("*")
      .eq("sorteio_id", atual.id)
      .gte("numero", inicio)
      .lte("numero", fim)
      .order("numero"),
    atual.pix_chave_id
      ? supabase.from("pix_chaves").select("*").eq("id", atual.pix_chave_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const agora = new Date();
  const docId = `CT-${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" })
    .format(agora)
    .replace(/-/g, "")}-${new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(agora)
    .replace(":", "")}`;

  const precoFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(atual.preco_cartela);

  // Um QR por cartela: o txid muda a cada número, e é ele que identifica o
  // pagamento no extrato. Sem chave vinculada, a folha sai sem a faixa.
  const qrPorNumero = new Map<number, string>();
  if (chave) {
    for (const c of cartelas ?? []) {
      const payload = montarBrCode({
        chave: chave.chave,
        nomeRecebedor: chave.nome_recebedor,
        cidade: chave.cidade,
        txid: montarTxid(chave.mensagem, c.numero),
      });
      qrPorNumero.set(
        c.numero,
        await QRCode.toString(payload, {
          type: "svg",
          margin: 0,
          errorCorrectionLevel: "M",
        }),
      );
    }
  }

  const proximoInicio = fim + 1;
  const anteriorInicio = Math.max(atual.cartela_min, inicio - POR_PAGINA);

  return (
    <div className="bg-[#ded2c3] px-4 py-8 print:bg-white print:p-0">
      <style dangerouslySetInnerHTML={{ __html: CARTELA_CSS }} />

      <div className="no-print mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d5658]">
            {atual.nome}
          </div>
          <div className="text-[13.5px] font-black text-[#241012]">
            Cartelas {inicio} a {Math.min(fim, atual.cartela_max)} ·{" "}
            {formatInt(cartelas?.length ?? 0)} folhas
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {inicio > atual.cartela_min ? (
            <Link
              href={`/admin/cartelas/imprimir?de=${anteriorInicio}&ate=${anteriorInicio + POR_PAGINA - 1}`}
              className="rounded-lg border border-[#e4d9c8] bg-[#fffdf8] px-3.5 py-2 text-[12.5px] font-bold text-[#241012]"
            >
              ← anteriores
            </Link>
          ) : null}
          {proximoInicio <= atual.cartela_max ? (
            <Link
              href={`/admin/cartelas/imprimir?de=${proximoInicio}&ate=${proximoInicio + POR_PAGINA - 1}`}
              className="rounded-lg border border-[#e4d9c8] bg-[#fffdf8] px-3.5 py-2 text-[12.5px] font-bold text-[#241012]"
            >
              próximas →
            </Link>
          ) : null}
          <PrintButton />
        </div>
      </div>

      {(cartelas ?? []).length === 0 ? (
        <p className="no-print mx-auto max-w-[210mm] rounded-xl bg-[#fffdf8] px-4 py-6 text-center text-[13.5px] text-[#6d5658]">
          Nenhuma cartela nesta faixa. Gere as cartelas em{" "}
          <Link href="/admin/cartelas/gerar" className="font-bold underline">
            Gerar cartelas
          </Link>
          .
        </p>
      ) : null}

      {(cartelas ?? []).map((cartela) => {
        const linhas = gradeDaCartela(cartela.numeros);
        const numeroImpresso = String(cartela.numero).padStart(4, "0");
        const qr = qrPorNumero.get(cartela.numero);

        const carimbo = (
          <div className="carimbo">
            <div className="marca">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="carimbo-logo" src="/brand/logo-simbolo-mono-escuro.svg" alt="" />
            </div>
            <div className="dados">
              <div className="doc">DOC {docId}</div>
              <div className="cod">{cartela.codigo_verificacao}</div>
              <div className="cart">Cartela {numeroImpresso}</div>
            </div>
          </div>
        );

        return (
          <div key={cartela.id} className="folha-cartela">
            <div className="area-arte">
              Área da arte do sorteio
              <br />
              (prêmios, data, local, atrações — impressos fora do sistema)
            </div>

            <div className="bloco">
              <div className="bloco-topo">
                <div className="cartela-num">
                  Cartela: <b>{numeroImpresso}</b>
                </div>
                <div className="selo-topo">
                  {docId} · {cartela.codigo_verificacao}
                </div>
              </div>

              <div className="quadros">
                {Array.from({ length: cartela.quadros }, (_, i) => i + 1).flatMap((q) => {
                  const quadro = (
                    <div className="quadro" key={`q-${q}`}>
                      <div className="quadro-topo">
                        <span className="quadro-premio">{ORDINAIS[q - 1]} prêmio</span>
                        <span className="quadro-cod">
                          {numeroImpresso}-{q}
                        </span>
                      </div>
                      <table className="grade">
                        <thead>
                          <tr>
                            {["B", "I", "N", "G", "O"].map((l) => (
                              <th key={l}>{l}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {linhas.map((linha, li) => (
                            <tr key={li}>
                              {linha.map((valor, ci) =>
                                valor === null ? (
                                  <td key={ci} className="centro">
                                    {/* Variante SEM o "65" do brasão: na grade,
                                        aquele número é uma dezena válida da
                                        coluna O e confundiria quem está
                                        marcando com caneta. */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      className="celula-logo"
                                      src="/brand/logo-simbolo-sem-numero.svg"
                                      alt=""
                                    />
                                  </td>
                                ) : (
                                  <td key={ci}>{String(valor).padStart(2, "0")}</td>
                                ),
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );

                  // A faixa entra depois do 2º quadro: com 2 quadros ela fica
                  // logo abaixo da única linha; com 3 ou 4, no meio das duas.
                  if (q !== 2) return [quadro];
                  return [
                    quadro,
                    <div className="faixa-qr" key="faixa">
                      <div className="faixa-pix">
                        {qr ? (
                          <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
                        ) : null}
                        <div className="qr-texto">
                          <div className="rot">Pague com Pix</div>
                          <div className="instrucao">
                            Aponte a câmera do seu banco e <b>digite o valor</b> — some as
                            cartelas que levar e pague de uma vez.
                          </div>
                          <dl>
                            <dt>Recebedor:</dt>
                            <dd>{chave?.nome_recebedor ?? "—"}</dd>
                            <dt>Cartela:</dt>
                            <dd>{precoFormatado} cada</dd>
                            <dt>Referência:</dt>
                            <dd className="msg">
                              {montarTxid(chave?.mensagem, cartela.numero)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="faixa-carimbo">{carimbo}</div>
                    </div>,
                  ];
                })}
              </div>

              <div className="canhoto">
                <div className="canhoto-aviso">
                  — destaque aqui e entregue à coordenação —
                </div>
                <div className="canhoto-corpo">
                  <div className="campos">
                    <div className="campo">
                      <span className="rot">Nome completo:</span>
                      <span className="linha" />
                    </div>
                    <div className="campo">
                      <span className="rot">Endereço completo:</span>
                      <span className="linha" />
                    </div>
                    <div className="campo">
                      <span className="rot">Telefone:</span>
                      <span className="linha" />
                    </div>
                  </div>
                  {carimbo}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
