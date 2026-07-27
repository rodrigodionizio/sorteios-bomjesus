"use client";

import { useActionState, useEffect, useMemo, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate, formatInt } from "@/lib/format";
import { computeGaps } from "@/lib/gaps";
import { createBaixa, baixarRestante, type BaixaFormState } from "./actions";

type Lote = {
  id: string;
  numero_inicial: number;
  numero_final: number;
  quantidade: number;
  tipo: "bloco" | "avulsa";
};

type Baixa = {
  id: string;
  numero_inicial: number;
  numero_final: number;
  quantidade: number;
  forma_confirmacao: string;
  created_at: string;
};

const FORMA_LABEL: Record<string, string> = {
  dinheiro: "dinheiro",
  confirmacao_vendedor: "confirmação",
  ambos: "ambos",
};

const initialState: BaixaFormState = {};

export function LoteCard({ lote, baixas }: { lote: Lote; baixas: Baixa[] }) {
  const confirmado = baixas.reduce((s, b) => s + b.quantidade, 0);
  const gaps = useMemo(
    () =>
      computeGaps(
        lote.numero_inicial,
        lote.numero_final,
        baixas.map((b) => ({ inicio: b.numero_inicial, fim: b.numero_final })),
      ),
    [lote, baixas],
  );

  const pct = Math.round((confirmado / lote.quantidade) * 100);
  const isDone = gaps.length === 0;
  const isEmpty = confirmado === 0;

  const [restantePending, startRestante] = useTransition();

  const action = createBaixa;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Baixa confirmada.");
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  const proximoGap = gaps[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3.5 px-5 py-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[19px] font-black tabular-nums">
            {lote.numero_inicial === lote.numero_final
              ? lote.numero_inicial
              : `${lote.numero_inicial} – ${lote.numero_final}`}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground capitalize">
            {lote.tipo}
          </span>
        </div>
        <span
          className={cn(
            "text-[13px] font-bold",
            isDone ? "text-good" : isEmpty ? "text-muted-foreground" : "text-dourado-deep",
          )}
        >
          {isDone
            ? "Confirmada"
            : isEmpty
              ? "Nenhuma confirmada ainda"
              : `${formatInt(confirmado)} de ${formatInt(lote.quantidade)} confirmadas`}
        </span>
      </div>

      <div className="mx-5 mb-3.5 flex h-2 overflow-hidden rounded-full bg-secondary">
        <span className="block h-full bg-dourado" style={{ width: `${pct}%` }} />
      </div>

      {baixas.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-5 pb-3.5">
          {baixas.map((b) => (
            <span
              key={b.id}
              className="rounded-full bg-good-bg px-2.5 py-1 text-xs font-bold text-good"
            >
              {b.numero_inicial === b.numero_final
                ? b.numero_inicial
                : `${b.numero_inicial}–${b.numero_final}`}{" "}
              · {FORMA_LABEL[b.forma_confirmacao]} · {formatDate(b.created_at)}
            </span>
          ))}
        </div>
      ) : null}

      {isDone ? (
        <div className="flex items-center gap-2 px-5 pb-4 text-[13px] font-bold text-good">
          <span>✓</span>
          <span>Baixa completa registrada</span>
        </div>
      ) : (
        <div className="border-t border-border bg-secondary/60 px-5 py-4.5">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[42ch] text-[13px] text-muted-foreground">
              {isEmpty
                ? "Confirme só o que o vendedor já prestou contas — parte do lote ou o bloco inteiro."
                : `Ainda faltam ${formatInt(lote.quantidade - confirmado)} cartela(s) para confirmar.`}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={restantePending}
              onClick={() => startRestante(() => baixarRestante(lote.id))}
              className="border-border font-bold"
            >
              {restantePending
                ? "Baixando..."
                : isEmpty
                  ? "Baixar lote inteiro"
                  : "Baixar tudo que falta"}
            </Button>
          </div>
          <form
            ref={formRef}
            action={formAction}
            className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.3fr_auto] sm:items-end"
          >
            <input type="hidden" name="lote_id" value={lote.id} />
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Nº inicial
              </Label>
              <Input
                name="numero_inicial"
                inputMode="numeric"
                defaultValue={proximoGap?.inicio}
                key={`ini-${state.success}`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Nº final
              </Label>
              <Input
                name="numero_final"
                inputMode="numeric"
                defaultValue={proximoGap?.fim}
                key={`fim-${state.success}`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Forma de confirmação
              </Label>
              <select
                name="forma_confirmacao"
                defaultValue="dinheiro"
                className="h-9 rounded-md border border-border bg-card px-2.5 text-sm font-semibold"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="confirmacao_vendedor">Confirmação</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={pending}
              className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
            >
              {pending ? "Confirmando..." : "Confirmar baixa"}
            </Button>

            {state.error ? (
              <p className="col-span-full flex items-start gap-2 rounded-md bg-bad-bg px-3 py-2 text-[12.5px] font-semibold text-bad">
                <span>✕</span>
                <span>{state.error}</span>
              </p>
            ) : null}
          </form>
        </div>
      )}
    </div>
  );
}
