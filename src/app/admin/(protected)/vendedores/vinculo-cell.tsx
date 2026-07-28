"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";
import { regenerarCodigo, desvincularConta } from "./actions";

export function VinculoCell({
  vendedorId,
  email,
  codigoVinculo,
}: {
  vendedorId: string;
  email: string | null;
  codigoVinculo: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [mostrarCodigo, setMostrarCodigo] = useState(false);

  if (email) {
    return (
      <div className="flex items-center justify-end gap-3">
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-good">
          <CheckIcon className="size-3.5" /> vinculado a {email}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Desvincular a conta de ${email}? A pessoa perde o acesso, e um novo código de vínculo é gerado na hora.`)) {
              return;
            }
            startTransition(async () => {
              try {
                await desvincularConta(vendedorId);
                toast.success("Conta desvinculada.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Não foi possível desvincular.");
              }
            });
          }}
          className="text-[12px] font-bold text-bad hover:underline disabled:opacity-50"
        >
          {pending ? "Desvinculando..." : "Desvincular conta"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2.5">
      <span className="font-mono text-[12.5px] font-bold tracking-[0.15em] text-vinho-deep">
        {mostrarCodigo ? (codigoVinculo ?? "—") : "••••••"}
      </span>
      <button
        type="button"
        onClick={() => setMostrarCodigo((v) => !v)}
        className="text-[11.5px] font-bold text-muted-foreground hover:underline"
      >
        {mostrarCodigo ? "ocultar" : "mostrar"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              const novoCodigo = await regenerarCodigo(vendedorId);
              setMostrarCodigo(true);
              toast.success(`Novo código gerado: ${novoCodigo}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Não foi possível gerar o código.");
            }
          });
        }}
        className="text-[11.5px] font-bold text-vinho-deep hover:underline disabled:opacity-50"
      >
        {pending ? "gerando..." : "gerar novo"}
      </button>
    </div>
  );
}
