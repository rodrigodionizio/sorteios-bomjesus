import type { Metadata } from "next";
import Image from "next/image";
import { CheckIcon, SearchXIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { gradeDaCartela } from "@/lib/bingo";

export const metadata: Metadata = {
  title: "Verificar cartela",
  description:
    "Confira se uma cartela foi realmente emitida pelo sistema da Paróquia Senhor Bom Jesus.",
};

export const dynamic = "force-dynamic";

/**
 * A rota que o carimbo impresso promete. Pública de propósito — quem tem a
 * cartela na mão precisa poder conferir sem login.
 *
 * Só responde sobre o código digitado: não existe caminho para listar
 * cartelas, porque isso permitiria escolher "a que está mais perto de
 * ganhar" antes de comprar. Quem erra o código não descobre nada.
 */
export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  const codigoLimpo = (codigo ?? "").trim();

  const supabase = await createClient();
  const { data } = codigoLimpo
    ? await supabase.rpc("fn_verificar_cartela", { p_codigo: codigoLimpo })
    : { data: null };

  const cartela = data?.[0] ?? null;

  return (
    <div className="min-h-screen bg-[#fbf3e2] px-4 py-12 text-[#2a0d13]">
      <div className="mx-auto max-w-lg">
        <div className="mb-7 flex items-center gap-2.5">
          <Image src="/brand/logo-simbolo-cor.svg" alt="" width={30} height={30} />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Paróquia Senhor Bom Jesus
            </div>
            <h1 className="text-[19px] font-black leading-tight">Verificar cartela</h1>
          </div>
        </div>

        <form
          method="get"
          className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <label
            htmlFor="codigo"
            className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            Código do carimbo
          </label>
          <div className="flex gap-2.5">
            <input
              id="codigo"
              name="codigo"
              defaultValue={codigoLimpo}
              placeholder="Ex.: 4K7X2QP9"
              maxLength={8}
              required
              className="h-11 flex-1 rounded-lg border border-input bg-transparent px-3.5 font-mono text-[16px] font-bold uppercase tracking-[0.12em]"
            />
            <button
              type="submit"
              className="h-11 rounded-lg bg-cereja px-5 text-[14px] font-extrabold text-white"
            >
              Conferir
            </button>
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            O código de 8 caracteres está no carimbo impresso na sua cartela.
          </p>
        </form>

        {codigoLimpo && cartela ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-good-bg px-3 py-1 text-[12px] font-extrabold text-good">
              <CheckIcon className="size-3.5" /> Cartela autêntica
            </div>
            <h2 className="text-[22px] font-black">
              Cartela nº {String(cartela.numero).padStart(4, "0")}
            </h2>
            <p className="mt-0.5 text-[13.5px] text-muted-foreground">
              {cartela.sorteio_nome}
              {cartela.sorteio_data
                ? ` · sorteio em ${formatDate(`${cartela.sorteio_data}T00:00:00`)}`
                : ""}
            </p>

            <div className="mt-4 grid grid-cols-5 gap-1">
              {["B", "I", "N", "G", "O"].map((l) => (
                <div
                  key={l}
                  className="rounded bg-vinho py-1 text-center text-[13px] font-black text-bege"
                >
                  {l}
                </div>
              ))}
              {gradeDaCartela(cartela.numeros).flatMap((linha, li) =>
                linha.map((valor, ci) => (
                  <div
                    key={`${li}-${ci}`}
                    className={
                      valor === null
                        ? "rounded bg-dourado py-2 text-center text-[10px] font-black text-[#3a1400]"
                        : "rounded border border-border py-2 text-center text-[14px] font-bold tabular-nums"
                    }
                  >
                    {valor === null ? "livre" : String(valor).padStart(2, "0")}
                  </div>
                )),
              )}
            </div>

            <p className="mt-4 text-[12px] text-muted-foreground">
              {cartela.quadros} quadro(s) na folha · emitida em{" "}
              {formatDateTime(cartela.gerada_em)}
            </p>
          </div>
        ) : null}

        {codigoLimpo && !cartela ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <SearchXIcon className="mx-auto mb-2 size-7 text-muted-foreground" />
            <p className="text-[14px] font-bold">Não encontramos esse código.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Confira as letras e números do carimbo — eles são maiúsculos e
              não têm espaço. Se continuar sem achar, procure a coordenação.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
