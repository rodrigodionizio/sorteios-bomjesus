"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatInt } from "@/lib/format";
import { gerarCartelas, type GerarCartelasState } from "./actions";

const initialState: GerarCartelasState = {};

export function GerarForm({
  sorteioId,
  cartelaMin,
  cartelaMax,
  proximaLivre,
}: {
  sorteioId: string;
  cartelaMin: number;
  cartelaMax: number;
  /** Primeiro número ainda sem cartela — o começo natural da próxima leva. */
  proximaLivre: number;
}) {
  const action = gerarCartelas.bind(null, sorteioId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [quadros, setQuadros] = useState(2);
  const [de, setDe] = useState(String(proximaLivre));
  const [ate, setAte] = useState(String(Math.min(proximaLivre + 499, cartelaMax)));
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.geradas !== undefined) {
      if (state.geradas === 0) {
        toast.info("Nenhuma cartela nova — todas dessa faixa já existiam.");
      } else {
        toast.success(
          `${formatInt(state.geradas)} cartelas geradas${
            state.puladas ? ` · ${formatInt(state.puladas)} já existiam e foram mantidas` : ""
          }.`,
        );
      }
    }
    wasPending.current = pending;
  }, [pending, state]);

  const quantidade = Math.max(0, (Number(ate) || 0) - (Number(de) || 0) + 1);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
          Faixa a gerar
        </Label>
        <div className="flex flex-wrap items-center gap-2.5">
          <Input
            name="de"
            type="number"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            min={cartelaMin}
            max={cartelaMax}
            required
            className="w-28"
          />
          <span className="text-[13px] text-muted-foreground">até</span>
          <Input
            name="ate"
            type="number"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            min={cartelaMin}
            max={cartelaMax}
            required
            className="w-28"
          />
          <button
            type="button"
            onClick={() => {
              setDe(String(cartelaMin));
              setAte(String(cartelaMax));
            }}
            className="text-[12px] font-bold text-vinho-deep hover:underline"
          >
            usar o sorteio inteiro ({formatInt(cartelaMax - cartelaMin + 1)})
          </button>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Dentro de {cartelaMin}–{cartelaMax}, a faixa do sorteio. Números que
          já têm cartela são <strong className="text-foreground">pulados</strong>,
          nunca sobrescritos — dá para gerar aos poucos.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
          Quadros por cartela
        </Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setQuadros(n)}
              className={
                quadros === n
                  ? "h-10 w-12 rounded-lg bg-vinho text-[15px] font-black text-bege"
                  : "h-10 w-12 rounded-lg border border-border bg-card text-[15px] font-bold text-muted-foreground hover:border-vinho/40"
              }
            >
              {n}
            </button>
          ))}
        </div>
        <input type="hidden" name="quadros" value={quadros} />
        <p className="text-[12px] text-muted-foreground">
          Cada quadro repete a mesma numeração e concorre a um prêmio
          diferente — {quadros === 1 ? "um prêmio" : `até ${quadros} prêmios`} por
          cartela. Dois quadros por linha na folha.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button
          type="submit"
          disabled={pending || quantidade === 0}
          className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
        >
          {pending ? "Gerando..." : `Gerar ${formatInt(quantidade)} cartelas`}
        </Button>
      </div>
    </form>
  );
}
