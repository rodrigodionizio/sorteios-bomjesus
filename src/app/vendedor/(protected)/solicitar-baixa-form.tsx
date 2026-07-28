"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { solicitarBaixa, type SolicitarBaixaState } from "./actions";

type LoteOption = {
  lote_id: string;
  numero_inicial: number;
  numero_final: number;
  quantidade: number;
  confirmado: number;
};

const FORMAS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
] as const;

const initialState: SolicitarBaixaState = {};

export function SolicitarBaixaForm({ lotes }: { lotes: LoteOption[] }) {
  const [state, formAction, pending] = useActionState(solicitarBaixa, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [loteId, setLoteId] = useState(lotes[0]?.lote_id ?? "");
  const [forma, setForma] = useState<(typeof FORMAS)[number]["value"]>("pix");

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Solicitação enviada — aguarde a confirmação da coordenação.");
      formRef.current?.reset();
      setForma("pix");
    }
    wasPending.current = pending;
  }, [pending, state]);

  const loteAtual = lotes.find((l) => l.lote_id === loteId);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Lote
        </Label>
        <select
          name="lote_id"
          value={loteId}
          onChange={(e) => setLoteId(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2.5 text-sm font-semibold"
        >
          {lotes.map((l) => (
            <option key={l.lote_id} value={l.lote_id}>
              {l.numero_inicial === l.numero_final
                ? l.numero_inicial
                : `${l.numero_inicial} – ${l.numero_final}`}{" "}
              ({l.quantidade - l.confirmado} pendentes)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Nº inicial
          </Label>
          <Input
            name="numero_inicial"
            inputMode="numeric"
            defaultValue={loteAtual?.numero_inicial}
            key={`ini-${loteId}-${state.success}`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Nº final
          </Label>
          <Input
            name="numero_final"
            inputMode="numeric"
            defaultValue={loteAtual?.numero_final}
            key={`fim-${loteId}-${state.success}`}
          />
        </div>
      </div>
      {state.fieldErrors?.numero_final ? (
        <p className="text-xs font-semibold text-bad">{state.fieldErrors.numero_final}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Forma de pagamento
        </Label>
        <div className="inline-flex gap-0.5 rounded-lg border border-border bg-secondary p-0.5">
          <input type="hidden" name="forma_alegada" value={forma} />
          {FORMAS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setForma(f.value)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-[13px] font-bold",
                forma === f.value ? "bg-vinho text-bege" : "text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {forma !== "dinheiro" ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Comprovante (opcional)
          </Label>
          <input
            type="file"
            name="comprovante"
            accept="image/*,application/pdf"
            className="text-[13px] file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-[12.5px] file:font-bold"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Observação (opcional)
        </Label>
        <textarea
          name="observacao"
          rows={2}
          placeholder='Ex.: "Pix enviado dia 20, recebido pela Dona Marta"'
          className="rounded-md border border-border bg-card px-2.5 py-2 text-sm"
        />
      </div>

      {state.error ? (
        <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || !loteId}
        className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
      >
        {pending ? "Enviando..." : "Enviar solicitação"}
      </Button>
    </form>
  );
}
