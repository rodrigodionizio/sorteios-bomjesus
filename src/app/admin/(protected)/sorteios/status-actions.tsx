"use client";

import { useTransition } from "react";
import { updateSorteioStatus } from "./actions";

export function StatusActions({
  sorteioId,
  status,
}: {
  sorteioId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  const set = (next: "planejado" | "em_andamento" | "encerrado") =>
    startTransition(() => updateSorteioStatus(sorteioId, next));

  if (status === "encerrado") {
    return <span className="text-xs text-muted-foreground">Encerrado</span>;
  }

  return (
    <div className="flex gap-3">
      {status === "planejado" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => set("em_andamento")}
          className="text-[13px] font-bold text-vinho disabled:opacity-50"
        >
          Iniciar
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => set("encerrado")}
        className="text-[13px] font-bold text-bad disabled:opacity-50"
      >
        Encerrar
      </button>
    </div>
  );
}
