import Link from "next/link";
import { ArrowRightIcon, TrophyIcon } from "lucide-react";
import { formatarNumeroCartela, type Premiado } from "@/lib/resultado";

/**
 * A faixa dourada da landing: o último sorteio encerrado com apuração.
 *
 * Resumo, não resultado completo — mostra o nome de quem ganhou cada
 * cartela e o maior vendedor, e leva ao `/placar/[id]`, onde estão os
 * vendedores de cada cartela e a premiação inteira.
 */
export function FaixaResultado({
  sorteio,
  premiados,
}: {
  sorteio: { id: string; nome: string; cartela_max: number };
  premiados: Premiado[];
}) {
  // Um chip por prêmio: o de cartela mostra o ganhador (quem comprou); o de
  // venda, o vendedor. `premiados` já chega com o principal primeiro.
  const chips = premiados.slice(0, 4).map((p) =>
    p.tipo === "cartela"
      ? {
          chave: p.chave,
          rotulo: `${p.principal ? "Prêmio principal" : p.titulo} · nº ${formatarNumeroCartela(p.numero, sorteio.cartela_max)}`,
          nome: p.comprador,
        }
      : { chave: p.chave, rotulo: p.rotulo, nome: p.vendedor },
  );

  return (
    <Link
      href={`/placar/${sorteio.id}`}
      className="block rounded-2xl bg-gradient-to-br from-dourado to-[#f2a23f] p-4.5 text-[#3a1400] shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3a1400]/13 px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.09em]">
        <TrophyIcon className="size-3.5" /> Resultado
      </span>
      <h3 className="mt-2 text-[22px] font-black leading-tight">{sorteio.nome}</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <div
            key={c.chave}
            className="min-w-0 rounded-lg border border-[#3a1400]/13 bg-[#fffdf8]/75 px-3 py-1.5"
          >
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
              {c.rotulo}
            </span>
            {c.nome ? (
              <b className="block text-[14.5px] font-black leading-tight">{c.nome}</b>
            ) : (
              <span className="block text-[13px] font-bold italic text-muted-foreground">
                não informado
              </span>
            )}
          </div>
        ))}
      </div>

      <span className="mt-3.5 inline-flex items-center gap-1 text-[12.5px] font-black">
        Ver resultado completo <ArrowRightIcon className="size-3.5" />
      </span>
    </Link>
  );
}
