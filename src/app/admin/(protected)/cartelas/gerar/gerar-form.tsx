"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { gerarCartelas, type GerarCartelasState } from "./actions";

const initialState: GerarCartelasState = {};

export function GerarForm({
  sorteioId,
  totalCartelas,
  jaGeradas,
}: {
  sorteioId: string;
  totalCartelas: number;
  jaGeradas: number;
}) {
  const action = gerarCartelas.bind(null, sorteioId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [quadros, setQuadros] = useState(2);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.geradas) {
      toast.success(`${state.geradas} cartelas geradas.`);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
          diferente — {quadros === 1 ? "um prêmio" : `até ${quadros} prêmios`} por cartela.
          Dois quadros por linha na folha.
        </p>
      </div>

      {jaGeradas > 0 ? (
        <label className="flex items-start gap-2 rounded-lg bg-bad-bg px-3.5 py-3 text-[13px] font-semibold text-bad">
          <input type="checkbox" name="confirmar_regeracao" className="mt-0.5 size-4" />
          <span>
            Apagar as {jaGeradas} cartelas já geradas e criar tudo de novo.
            <span className="mt-0.5 block font-normal">
              A numeração muda. Se alguma folha já foi impressa e entregue,
              ela deixa de valer.
            </span>
          </span>
        </label>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button
          type="submit"
          disabled={pending}
          className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
        >
          {pending
            ? "Gerando..."
            : `Gerar ${totalCartelas} cartelas`}
        </Button>
      </div>
    </form>
  );
}
