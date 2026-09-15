"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Premio } from "@/lib/premios";
import { PremioFields } from "./premio-fields";
import {
  atualizarPremio,
  moverPremio,
  removerPremio,
  type PremioFormState,
} from "./actions";

const initialState: PremioFormState = {};

export function PremioRowActions({
  premio,
  podeSubir,
  podeDescer,
}: {
  premio: Premio;
  podeSubir: boolean;
  podeDescer: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const mover = (direcao: "cima" | "baixo") =>
    startTransition(async () => {
      try {
        await moverPremio(premio.id, premio.sorteio_id, direcao);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível mover.");
      }
    });

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        aria-label="Subir na lista"
        disabled={pending || !podeSubir}
        onClick={() => mover("cima")}
        className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30"
      >
        <ChevronUpIcon className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Descer na lista"
        disabled={pending || !podeDescer}
        onClick={() => mover("baixo")}
        className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30"
      >
        <ChevronDownIcon className="size-4" />
      </button>

      <EditPremioDialog premio={premio} />

      <RemoverPremioButton premio={premio} />
    </div>
  );
}

function EditPremioDialog({ premio }: { premio: Premio }) {
  const [open, setOpen] = useState(false);
  const action = atualizarPremio.bind(null, premio.id, premio.sorteio_id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Prêmio atualizado.");
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 border-border font-bold"
        onClick={() => setOpen(true)}
      >
        Editar
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar prêmio</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {/* `key={String(open)}` remonta os campos a cada abertura, para que
              `defaultValue` volte a valer — o mesmo cuidado já documentado
              para diálogos neste projeto. */}
          <PremioFields
            key={String(open)}
            valores={{
              categoria: premio.categoria,
              titulo: premio.titulo,
              descricao: premio.descricao ?? "",
              valor: premio.valor === null ? "" : String(premio.valor),
              quantidade: String(premio.quantidade),
              exibir_publico: premio.exibir_publico,
            }}
            fieldErrors={state.fieldErrors}
          />

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

function RemoverPremioButton({ premio }: { premio: Premio }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-lg px-2.5 text-[12px] font-bold text-bad hover:bg-bad-bg"
      >
        Remover
      </button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover prêmio?</DialogTitle>
        </DialogHeader>
        <p className="text-[13.5px] text-muted-foreground">
          <strong className="text-foreground">{premio.titulo}</strong> sai da
          premiação deste sorteio e do site público. Isso não afeta nenhuma
          apuração já registrada.
        </p>
        <DialogFooter className="-mx-0 -mb-0 rounded-none border-none bg-transparent p-0 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-border font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await removerPremio(premio.id, premio.sorteio_id);
                  toast.success("Prêmio removido.");
                  setOpen(false);
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Não foi possível remover.",
                  );
                }
              })
            }
            className="bg-bad font-extrabold text-white hover:bg-bad/90"
          >
            {pending ? "Removendo..." : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
