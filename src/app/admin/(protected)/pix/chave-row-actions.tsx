"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { definirChavePadrao, alternarChaveAtiva } from "./actions";

export function ChaveRowActions({
  chaveId,
  ativa,
  padrao,
}: {
  chaveId: string;
  ativa: boolean;
  padrao: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3">
      {!padrao ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await definirChavePadrao(chaveId);
                toast.success("Chave definida como padrão.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Não foi possível definir.");
              }
            })
          }
          className="text-[11.5px] font-bold text-vinho-deep hover:underline disabled:opacity-50"
        >
          tornar padrão
        </button>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await alternarChaveAtiva(chaveId, !ativa);
              toast.success(ativa ? "Chave desativada." : "Chave reativada.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Não foi possível alterar.");
            }
          })
        }
        className="text-[11.5px] font-bold text-muted-foreground hover:underline disabled:opacity-50"
      >
        {ativa ? "desativar" : "reativar"}
      </button>
    </div>
  );
}
