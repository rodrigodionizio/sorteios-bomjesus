"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createSorteio, type SorteioFormState } from "./actions";

const initialState: SorteioFormState = {};

export function SorteioForm() {
  const [state, formAction, pending] = useActionState(
    createSorteio,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      toast.success("Sorteio criado com sucesso.");
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <Field label="Nome" error={err("nome")} className="sm:col-span-2">
        <Input name="nome" placeholder="Ex.: Sorteio Bom Jesus 2027" required />
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cartela inicial" error={err("cartela_min")}>
          <Input name="cartela_min" type="number" defaultValue={1} min={1} required />
        </Field>
        <Field label="Cartela final" error={err("cartela_max")}>
          <Input name="cartela_max" type="number" defaultValue={1500} min={1} required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Preço da cartela (R$)" error={err("preco_cartela")}>
          <Input name="preco_cartela" type="number" step="0.01" defaultValue="10.00" min={0} required />
        </Field>
        <Field label="Data do sorteio" error={err("data_sorteio")}>
          <Input name="data_sorteio" type="date" />
        </Field>
      </div>

      <Field label="Descrição (opcional)" error={err("descricao")}>
        <Input name="descricao" placeholder="Ex.: campanha para reforma do salão paroquial" />
      </Field>

      {state.error ? (
        <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {state.error}
        </p>
      ) : null}

      <div className="mt-1 flex gap-2.5">
        <Button
          type="submit"
          disabled={pending}
          className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
        >
          {pending ? "Criando..." : "Criar sorteio"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
