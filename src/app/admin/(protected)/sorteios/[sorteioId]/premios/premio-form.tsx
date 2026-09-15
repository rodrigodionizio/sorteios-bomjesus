"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PremioFields, PREMIO_VAZIO } from "./premio-fields";
import { criarPremio, type PremioFormState } from "./actions";

const initialState: PremioFormState = {};

export function PremioForm({ sorteioId }: { sorteioId: string }) {
  const action = criarPremio.bind(null, sorteioId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  // Remontar os campos depois de cadastrar: `form.reset()` sozinho não
  // limpa um campo cujo `defaultValue` o React já considera montado.
  const [geracao, setGeracao] = useState(0);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Prêmio cadastrado.");
      formRef.current?.reset();
      setGeracao((g) => g + 1);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <PremioFields
        key={geracao}
        valores={PREMIO_VAZIO}
        fieldErrors={state.fieldErrors}
      />

      {state.error ? (
        <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)] sm:w-fit"
      >
        {pending ? "Cadastrando..." : "Cadastrar prêmio"}
      </Button>
    </form>
  );
}
