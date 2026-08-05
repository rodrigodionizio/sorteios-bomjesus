"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserIcon } from "lucide-react";
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
import { salvarComprador, type CompradorFormState } from "./actions";

const initialState: CompradorFormState = {};

export function EditCompradorDialog({
  sorteioId,
  loteId,
  numeroInicial,
  numeroFinal,
  nomeAtual,
  contatoAtual,
}: {
  sorteioId: string;
  loteId: string;
  numeroInicial: number;
  numeroFinal: number;
  nomeAtual?: string;
  contatoAtual?: string;
}) {
  const [open, setOpen] = useState(false);
  const action = salvarComprador.bind(null, sorteioId, loteId, numeroInicial, numeroFinal);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Comprador atualizado.");
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  const faixa = numeroInicial === numeroFinal ? `${numeroInicial}` : `${numeroInicial}–${numeroFinal}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-good/85 hover:underline"
      >
        <UserIcon className="size-3" /> {nomeAtual ?? "registrar comprador"}
      </button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comprador · cartela{numeroInicial === numeroFinal ? "" : "s"} {faixa}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
              Nome do comprador
            </Label>
            <Input
              name="comprador_nome"
              defaultValue={nomeAtual}
              placeholder="Deixe em branco para remover"
              key={`nome-${nomeAtual ?? ""}`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
              Contato
            </Label>
            <Input
              name="comprador_contato"
              defaultValue={contatoAtual}
              placeholder="Ex.: (33) 99876-5432"
              key={`contato-${contatoAtual ?? ""}`}
            />
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
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
