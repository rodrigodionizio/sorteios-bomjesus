import { TrophyIcon } from "lucide-react";
import { formatInt } from "@/lib/format";
import { formatarNumeroCartela, type Premiado } from "@/lib/resultado";
import { DESCRICAO_CATEGORIA, rotuloPremio, valorTotal, type Premio } from "@/lib/premios";

/**
 * A tela pública de um sorteio ENCERRADO: só os vencedores.
 *
 * Durante a campanha o placar mostra ranking, KPIs e progresso — é o que
 * mantém os vendedores engajados. Depois do sorteio nada disso interessa ao
 * público; o que as pessoas vêm procurar é quem ganhou. Por isso esta tela
 * não reaproveita o placar com blocos escondidos: é outra tela.
 *
 * Nada aqui é dado novo. Nome do comprador e nome do vendedor já saem em
 * `vw_resultado_publico`; contato e telefone continuam fora.
 */
export function ResultadoFinal({
  sorteio,
  premiados,
  premios,
}: {
  sorteio: {
    nome: string;
    data_sorteio: string | null;
    cartela_min: number;
    cartela_max: number;
  };
  premiados: Premiado[];
  premios: Premio[];
}) {
  const dataSorteio = sorteio.data_sorteio
    ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${sorteio.data_sorteio}T00:00:00`))
    : null;
  const total = sorteio.cartela_max - sorteio.cartela_min + 1;

  return (
    <>
      <section className="rounded-2xl bg-gradient-to-br from-dourado to-[#f2a23f] p-5 text-[#3a1400] shadow-sm sm:p-7">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3a1400]/13 px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.09em]">
          <TrophyIcon className="size-3.5" /> Resultado final
        </span>
        <p className="mt-2.5 font-humming text-[23px] text-[#3a1400]/62">
          {premiados.length > 0 ? "e os premiados são" : "sorteio encerrado"}
        </p>
        <h1 className="text-[28px] font-black leading-[1.05] tracking-tight text-balance sm:text-[40px]">
          {sorteio.nome}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[#3a1400]/70">
          {dataSorteio ? `Sorteio realizado em ${dataSorteio} · ` : ""}
          {formatInt(total)} cartelas
        </p>

        {premiados.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {premiados.map((p) => (
              <CartaoPremiado key={p.chave} premiado={p} cartelaMax={sorteio.cartela_max} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-[#3a1400]/13 bg-[#fffdf8]/72 px-4 py-5 text-[14px] text-[#3a1400]/80">
            O resultado deste sorteio ainda não foi publicado. Assim que a
            apuração for registrada, os premiados aparecem aqui.
          </p>
        )}
      </section>

      {premios.length > 0 ? (
        <>
          <div className="mb-2.5 mt-8 flex items-baseline justify-between gap-3">
            <h2 className="text-[11.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              Premiação deste sorteio
            </h2>
            <small className="text-[11.5px] text-muted-foreground">como foi anunciada</small>
          </div>
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {premios.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border px-4 py-3 last:border-none"
              >
                <strong className="text-[14.5px] font-black">{rotuloPremio(p)}</strong>
                {valorTotal(p) && p.quantidade > 1 ? (
                  <span className="text-[12px] font-bold text-dourado-deep">
                    ({valorTotal(p)} no total)
                  </span>
                ) : null}
                <span className="text-[13px] text-muted-foreground">
                  {p.descricao || DESCRICAO_CATEGORIA[p.categoria]}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

function CartaoPremiado({
  premiado,
  cartelaMax,
}: {
  premiado: Premiado;
  cartelaMax: number;
}) {
  return (
    <div className="rounded-xl border border-[#3a1400]/13 bg-[#fffdf8]/72 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.1em] text-dourado-deep">
        {premiado.tipo === "venda" ? "Prêmio de venda" : premiado.rotulo}
      </div>
      {premiado.titulo ? (
        <div className="mt-0.5 text-[15px] font-black leading-tight">{premiado.titulo}</div>
      ) : null}

      {premiado.tipo === "cartela" ? (
        <>
          <div className="mt-2.5 text-[36px] font-black leading-none tabular-nums text-vinho-deep">
            {formatarNumeroCartela(premiado.numero, cartelaMax)}
            <small className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
              cartela sorteada
            </small>
          </div>
          <Linha rotulo="Comprador(a)" valor={premiado.comprador} />
          <Linha
            rotulo="Vendida por"
            valor={premiado.vendedor}
            aConfirmar={!premiado.vendaConfirmada}
          />
        </>
      ) : (
        <Linha
          rotulo={premiado.rotulo}
          valor={premiado.vendedor}
          aConfirmar={premiado.vendaConfirmada === false}
        />
      )}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  aConfirmar = false,
}: {
  rotulo: string;
  valor: string | null;
  aConfirmar?: boolean;
}) {
  return (
    <div className="mt-2.5 border-t border-dashed border-[#3a1400]/18 pt-2.5">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
        {rotulo}
      </div>
      {valor ? (
        <div className="text-[17px] font-black leading-tight">
          {valor}
          {/* A cartela premiada não tinha baixa registrada: o nome é de quem
              RESERVOU a faixa, não de quem confirmou a venda. Aparece mesmo
              assim — decisão da coordenação —, mas sinalizado. */}
          {aConfirmar ? (
            <span className="ml-1.5 inline-block rounded bg-bad-bg px-1.5 py-px align-middle text-[9.5px] font-black uppercase tracking-wide text-bad">
              a confirmar
            </span>
          ) : null}
        </div>
      ) : (
        <div className="text-[14px] font-bold italic text-muted-foreground">não informado</div>
      )}
    </div>
  );
}
