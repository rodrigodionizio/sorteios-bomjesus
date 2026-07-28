"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatPhoneInput } from "@/lib/format";
import { vincularConta, type VincularState } from "./actions";

const initialState: VincularState = {};

export function VincularForm() {
  const [state, formAction, pending] = useActionState(vincularConta, initialState);
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="telefone" className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]">
          Celular cadastrado pela coordenação
        </Label>
        <Input
          id="telefone"
          name="telefone"
          inputMode="numeric"
          placeholder="(33) 98820-3127"
          value={telefone}
          onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
          required
        />
        {state.fieldErrors?.telefone ? (
          <p className="text-xs font-semibold text-bad">{state.fieldErrors.telefone}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="codigo_vinculo" className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]">
          Código de vínculo
        </Label>
        <Input
          id="codigo_vinculo"
          name="codigo_vinculo"
          maxLength={6}
          placeholder="K7X2QP"
          className="text-center font-black uppercase tracking-[0.3em]"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          required
        />
        <p className="text-[11.5px] text-muted-foreground">
          Repassado pela coordenação — sem ele, o celular sozinho não
          libera o acesso.
        </p>
        {state.fieldErrors?.codigo_vinculo ? (
          <p className="text-xs font-semibold text-bad">{state.fieldErrors.codigo_vinculo}</p>
        ) : null}
      </div>

      {state.error ? (
        <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 bg-cereja text-white font-extrabold hover:bg-[var(--brand-vinho-deep)]"
      >
        {pending ? "Vinculando..." : "Vincular conta"}
      </Button>
    </form>
  );
}
