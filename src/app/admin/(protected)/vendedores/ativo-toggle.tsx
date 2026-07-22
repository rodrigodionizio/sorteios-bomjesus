"use client";

import { useTransition } from "react";
import { setVendedorAtivo } from "./actions";

export function AtivoToggle({
  vendedorId,
  ativo,
}: {
  vendedorId: string;
  ativo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setVendedorAtivo(vendedorId, !ativo))}
      className="text-[13px] font-bold text-vinho disabled:opacity-50"
    >
      {ativo ? "Desativar" : "Reativar"}
    </button>
  );
}
