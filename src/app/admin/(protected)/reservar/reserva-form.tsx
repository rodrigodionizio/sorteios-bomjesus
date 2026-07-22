"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createLote, type LoteFormState } from "./actions";

const initialState: LoteFormState = {};

export function ReservaForm({
  sorteioId,
  vendedorId,
}: {
  sorteioId: string;
  vendedorId: string;
}) {
  const action = createLote.bind(null, sorteioId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  const [tipo, setTipo] = useState<"bloco" | "avulsa">("bloco");
  const [inicial, setInicial] = useState("");
  const [final, setFinal] = useState("");

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Cartelas reservadas com sucesso.");
      formRef.current?.reset();
      setInicial("");
      setFinal("");
    }
    wasPending.current = pending;
  }, [pending, state]);

  const quantidade =
    inicial && final && Number(final) >= Number(inicial)
      ? Number(final) - Number(inicial) + 1
      : 0;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="vendedor_id" value={vendedorId} />

      <div className="flex flex-col gap-1.5">
        <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
          Tipo
        </Label>
        <div className="inline-flex w-fit gap-0.5 rounded-lg border border-border bg-secondary p-0.5">
          <input type="hidden" name="tipo" value={tipo} />
          {(["bloco", "avulsa"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTipo(t);
                if (t === "avulsa") setFinal(inicial);
              }}
              className={cn(
                "rounded-md px-4 py-1.5 text-[13.5px] font-bold capitalize",
                tipo === t
                  ? "bg-vinho text-bege"
                  : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
            Nº inicial
          </Label>
          <Input
            name="numero_inicial"
            inputMode="numeric"
            value={inicial}
            onChange={(e) => {
              setInicial(e.target.value);
              if (tipo === "avulsa") setFinal(e.target.value);
            }}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
            Nº final
          </Label>
          <Input
            name="numero_final"
            inputMode="numeric"
            value={final}
            onChange={(e) => setFinal(e.target.value)}
            readOnly={tipo === "avulsa"}
            className={tipo === "avulsa" ? "bg-muted text-muted-foreground" : undefined}
            required
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between rounded-lg bg-bege px-3.5 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wide text-dourado-deep">
          Quantidade
        </span>
        <strong className="text-lg font-black text-vinho-deep">
          {quantidade} cartelas
        </strong>
      </div>

      {state.fieldErrors?.numero_final ? (
        <p className="text-xs font-semibold text-bad">
          {state.fieldErrors.numero_final}
        </p>
      ) : null}

      {state.error ? (
        <p className="flex items-start gap-2 rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          <span>✕</span>
          <span>{state.error}</span>
        </p>
      ) : quantidade > 0 ? (
        <p className="flex items-start gap-2 rounded-md bg-good-bg px-3 py-2 text-sm font-semibold text-good">
          <span>✓</span>
          <span>Pronto para reservar {quantidade} cartela(s).</span>
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || quantidade === 0}
        className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
      >
        {pending ? "Reservando..." : "Reservar cartelas"}
      </Button>
    </form>
  );
}
