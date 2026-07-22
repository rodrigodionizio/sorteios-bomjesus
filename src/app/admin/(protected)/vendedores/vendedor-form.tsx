"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatPhoneInput } from "@/lib/format";
import { createVendedor, type VendedorFormState } from "./actions";

const initialState: VendedorFormState = {};

export function VendedorForm() {
  const [state, formAction, pending] = useActionState(
    createVendedor,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      toast.success("Vendedor cadastrado com sucesso.");
      formRef.current?.reset();
      setTelefone("");
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
            Nome completo
          </Label>
          <Input name="nome" placeholder="Ex.: Maria de Fátima Souza" required />
          {state.fieldErrors?.nome ? (
            <p className="text-xs font-semibold text-bad">{state.fieldErrors.nome}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
            Telefone
          </Label>
          <Input
            name="telefone"
            placeholder="(33) 98820-3127"
            inputMode="numeric"
            value={telefone}
            onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
            required
          />
          {state.fieldErrors?.telefone ? (
            <p className="text-xs font-semibold text-bad">{state.fieldErrors.telefone}</p>
          ) : null}
        </div>
      </div>

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
          {pending ? "Cadastrando..." : "Cadastrar vendedor"}
        </Button>
      </div>
    </form>
  );
}
