"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatInt } from "@/lib/format";
import { apagarCartelas, type ApagarCartelasState } from "./actions";

const initialState: ApagarCartelasState = {};

/**
 * O caminho para refazer uma geração. Fica recolhido por padrão: é a única
 * ação destrutiva desta tela, e não deve competir visualmente com a
 * geração, que é o que se usa todo dia.
 */
export function ApagarForm({
  sorteioId,
  cartelaMin,
  cartelaMax,
}: {
  sorteioId: string;
  cartelaMin: number;
  cartelaMax: number;
}) {
  const action = apagarCartelas.bind(null, sorteioId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [aberto, setAberto] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.apagadas !== undefined) {
      toast.success(`${formatInt(state.apagadas)} cartelas apagadas.`);
      setAberto(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-[12.5px] font-bold text-muted-foreground hover:text-bad hover:underline"
      >
        apagar uma faixa de cartelas
      </button>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-bad/25 bg-bad-bg p-4">
      <p className="mb-3 text-[13px] font-semibold text-bad">
        Apagar cartelas de uma faixa
        <span className="mt-0.5 block font-normal">
          Use para refazer uma geração. Cartelas já reservadas por algum
          vendedor não são apagadas — o sistema recusa e diz qual faixa está
          presa.
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        <Input name="de" type="number" min={cartelaMin} max={cartelaMax} placeholder="de" required className="w-24 bg-card" />
        <Input name="ate" type="number" min={cartelaMin} max={cartelaMax} placeholder="até" required className="w-24 bg-card" />
        <Button
          type="submit"
          disabled={pending}
          className="bg-bad font-extrabold text-white hover:bg-bad/90"
        >
          {pending ? "Apagando..." : "Apagar faixa"}
        </Button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-[12.5px] font-bold text-muted-foreground hover:underline"
        >
          cancelar
        </button>
      </div>
      {state.error ? (
        <p className="mt-2.5 text-[13px] font-semibold text-bad">{state.error}</p>
      ) : null}
    </form>
  );
}
