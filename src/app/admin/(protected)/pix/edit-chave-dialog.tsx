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
import { TIPOS_CHAVE_PIX } from "@/lib/pix";
import { atualizarChavePix, type PixFormState } from "./actions";

const initialState: PixFormState = {};

type Chave = {
  id: string;
  apelido: string;
  tipo: string;
  chave: string;
  nome_recebedor: string;
  cidade: string;
  mensagem: string | null;
  banco: string | null;
  observacoes: string | null;
};

export function EditChaveDialog({ chave }: { chave: Chave }) {
  const [open, setOpen] = useState(false);
  const action = atualizarChavePix.bind(null, chave.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasPending = useRef(false);
  const [mensagem, setMensagem] = useState(chave.mensagem ?? "");

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Chave atualizada. As próximas impressões já saem com ela.");
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  const err = (campo: string) => state.fieldErrors?.[campo];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // devolve o valor salvo ao reabrir, para não guardar rascunho perdido
        if (next) setMensagem(chave.mensagem ?? "");
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11.5px] font-bold text-vinho-deep hover:underline"
      >
        editar
      </button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar chave Pix</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo label="Apelido" error={err("apelido")}>
              <Input name="apelido" defaultValue={chave.apelido} required />
            </Campo>
            <Campo label="Tipo da chave" error={err("tipo")}>
              <select
                name="tipo"
                defaultValue={chave.tipo}
                required
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
              >
                {TIPOS_CHAVE_PIX.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo label="Chave Pix" error={err("chave")}>
            <Input name="chave" defaultValue={chave.chave} required />
          </Campo>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo label="Nome do recebedor (máx. 25)" error={err("nome_recebedor")}>
              <Input name="nome_recebedor" defaultValue={chave.nome_recebedor} maxLength={25} required />
            </Campo>
            <Campo label="Cidade (máx. 15)" error={err("cidade")}>
              <Input name="cidade" defaultValue={chave.cidade} maxLength={15} required />
            </Campo>
          </div>

          <Campo label="Mensagem (opcional)" error={err("mensagem")}>
            <Input
              name="mensagem"
              maxLength={20}
              value={mensagem}
              onChange={(e) =>
                setMensagem(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
              }
              placeholder="BINGO26"
            />
          </Campo>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo label="Banco (opcional)" error={err("banco")}>
              <Input name="banco" defaultValue={chave.banco ?? ""} />
            </Campo>
            <Campo label="Observações (opcional)" error={err("observacoes")}>
              <Input name="observacoes" defaultValue={chave.observacoes ?? ""} />
            </Campo>
          </div>

          <p className="rounded-md bg-info-bg px-3 py-2 text-[12.5px] text-info">
            Corrigir a chave vale para as <strong>próximas impressões</strong>. As
            cartelas já impressas carregam o QR antigo e precisam ser reimpressas.
          </p>

          {state.error ? (
            <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
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

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
