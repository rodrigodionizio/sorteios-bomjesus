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

  const set = (next: "planejado" | "em_andamento" | "encerrado") => {
    // Regra 22 / R5: encerrar é definitivo — o banco não deixa reabrir nem
    // alterar mais nada. O alerta existe para ninguém encerrar por engano.
    if (next === "encerrado" && !window.confirm("Encerrar é DEFINITIVO.\n\nDepois de encerrado, nada deste sorteio poderá ser alterado — nem corrigir número apurado, nem reservas, baixas, compradores ou prêmios — e ele não poderá ser reaberto. É uma proteção para os compradores e para a auditoria.\n\nO painel da diretoria e o resultado público continuam acessíveis.\n\nConfira tudo antes (inclusive o nome do comprador da cartela premiada). Encerrar agora?")) return;
    startTransition(() => updateSorteioStatus(sorteioId, next));
  };

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
