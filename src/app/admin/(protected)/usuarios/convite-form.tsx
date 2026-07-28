"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { criarConvite, type ConviteFormState } from "./actions";

const initialState: ConviteFormState = {};

export function ConviteForm() {
  const [state, formAction, pending] = useActionState(criarConvite, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Convite criado — assim que a pessoa criar a conta com esse e-mail, o acesso é liberado sozinho.");
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
            Nome
          </Label>
          <Input name="nome" placeholder="Ex.: Ana Paula Ferreira" required />
          {state.fieldErrors?.nome ? (
            <p className="text-xs font-semibold text-bad">{state.fieldErrors.nome}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
            E-mail
          </Label>
          <Input name="email" type="email" placeholder="ana@paroquiabomjesus.org" required />
          {state.fieldErrors?.email ? (
            <p className="text-xs font-semibold text-bad">{state.fieldErrors.email}</p>
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
          {pending ? "Convidando..." : "Convidar administrador"}
        </Button>
      </div>
    </form>
  );
}
