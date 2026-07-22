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
      onClick={() => startTransition(() => updateSorteioStatus(sorteioId, "encerrado"))}
      className="border-bad font-extrabold text-bad hover:bg-bad-bg"
    >
      {disabled ? "Sorteio encerrado" : pending ? "Encerrando..." : "Encerrar sorteio"}
    </Button>
  );
}
