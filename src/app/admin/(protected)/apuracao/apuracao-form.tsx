"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apurarSorteio, type ApuracaoState } from "./actions";

const initialState: ApuracaoState = {};

export function ApuracaoForm({
  sorteioId,
  numeroAtual,
}: {
  sorteioId: string;
  numeroAtual?: number;
}) {
  const action = apurarSorteio.bind(null, sorteioId);
  const [state, formAction, pending] = useActionState(action, initialState);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (numeroAtual == null) return;
    const novo = new FormData(event.currentTarget).get("numero_sorteado");
    const confirmado = window.confirm(
      `Este sorteio já foi apurado com a cartela nº ${numeroAtual}. Registrar a cartela nº ${novo} no lugar? O resultado anterior fica no histórico de auditoria, mas deixa de valer.`,
    );
    if (!confirmado) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3.5">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
          Cartela premiada
        </Label>
        <Input
          name="numero_sorteado"
          inputMode="numeric"
          required
          placeholder={numeroAtual != null ? `Já apurado: nº ${numeroAtual}` : undefined}
          className="w-40 py-5 text-center text-[22px] font-black tabular-nums"
        />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="bg-cereja px-6 py-5.5 font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
      >
        {pending ? "Apurando..." : "Apurar sorteio"}
      </Button>
      {state.error ? (
        <p className="w-full text-sm font-semibold text-bad">{state.error}</p>
      ) : null}
    </form>
  );
}
