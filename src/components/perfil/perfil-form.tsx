"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateMeuPerfil, type PerfilFormState } from "@/lib/actions/perfil";

const initialState: PerfilFormState = {};

export function PerfilForm({
  displayName,
  cargo,
}: {
  displayName: string | null;
  cargo: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateMeuPerfil, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Perfil atualizado.");
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name" className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
          Nome de exibição
        </Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={displayName ?? ""}
          placeholder="Como prefere ser chamado(a)"
        />
        {state.fieldErrors?.display_name ? (
          <p className="text-xs font-semibold text-bad">{state.fieldErrors.display_name}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cargo" className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
          Cargo / função
        </Label>
        <Input
          id="cargo"
          name="cargo"
          defaultValue={cargo ?? ""}
          placeholder="Ex.: Coordenador(a) da Comunidade São José"
        />
        {state.fieldErrors?.cargo ? (
          <p className="text-xs font-semibold text-bad">{state.fieldErrors.cargo}</p>
        ) : null}
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
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
