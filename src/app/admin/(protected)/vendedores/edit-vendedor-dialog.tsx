"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatPhoneInput } from "@/lib/format";
import { updateVendedor, type VendedorFormState } from "./actions";

const initialState: VendedorFormState = {};

export function EditVendedorDialog({
  vendedorId,
  nome,
  telefone,
}: {
  vendedorId: string;
  nome: string;
  telefone: string;
}) {
  const [open, setOpen] = useState(false);
  const action = updateVendedor.bind(null, vendedorId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasPending = useRef(false);
  const [telefoneValue, setTelefoneValue] = useState(telefone);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Vendedor atualizado.");
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTelefoneValue(telefone);
      }}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-border font-bold"
        onClick={() => setOpen(true)}
      >
        Editar
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar vendedor</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
              Nome completo
            </Label>
            <Input name="nome" defaultValue={nome} required />
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
              inputMode="numeric"
              value={telefoneValue}
              onChange={(e) => setTelefoneValue(formatPhoneInput(e.target.value))}
              required
            />
            {state.fieldErrors?.telefone ? (
              <p className="text-xs font-semibold text-bad">{state.fieldErrors.telefone}</p>
            ) : null}
          </div>

          {state.error ? (
            <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
              {state.error}
            </p>
          ) : null}

          <DialogFooter className="-mx-0 -mb-0 rounded-none border-none bg-transparent p-0 sm:justify-end">
            <Button
              type="submit"
              disabled={pending}
              className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
            >
              {pending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
