"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateSorteioStatus } from "../sorteios/actions";

export function EncerrarButton({
  sorteioId,
  disabled,
}: {
  sorteioId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || pending}
      onClick={() => {
        // Encerrar é definitivo (regra 22 / R5): o banco não deixa reabrir.
        if (!window.confirm("Encerrar é DEFINITIVO.\n\nDepois de encerrado, nada deste sorteio poderá ser alterado — nem corrigir número apurado, nem reservas, baixas, compradores ou prêmios — e ele não poderá ser reaberto. É uma proteção para os compradores e para a auditoria.\n\nO painel da diretoria e o resultado público continuam acessíveis.\n\nConfira tudo antes (inclusive o nome do comprador da cartela premiada). Encerrar agora?")) return;
        startTransition(() => updateSorteioStatus(sorteioId, "encerrado"));
      }}
      className="border-bad font-extrabold text-bad hover:bg-bad-bg"
    >
      {disabled ? "Sorteio encerrado" : pending ? "Encerrando..." : "Encerrar sorteio"}
    </Button>
  );
}
