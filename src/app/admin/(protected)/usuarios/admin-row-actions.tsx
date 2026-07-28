"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { alterarPapel, removerAcesso } from "./actions";

export function AdminRowActions({
  perfilId,
  role,
  souSuperadmin,
  ehVoceMesmo,
}: {
  perfilId: string;
  role: "admin" | "superadmin";
  souSuperadmin: boolean;
  ehVoceMesmo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3">
      {souSuperadmin && !ehVoceMesmo ? (
        <select
          disabled={pending}
          value={role}
          onChange={(e) => {
            const novoRole = e.target.value as "admin" | "superadmin";
            startTransition(async () => {
              try {
                await alterarPapel(perfilId, novoRole);
                toast.success("Papel atualizado.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Não foi possível alterar o papel.");
              }
            });
          }}
          className="h-8 rounded-md border border-border bg-card px-2 text-[12.5px] font-bold"
        >
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      ) : null}

      {!ehVoceMesmo ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Remover o acesso desta pessoa? Ela deixa de conseguir entrar no painel.")) {
              return;
            }
            startTransition(async () => {
              try {
                await removerAcesso(perfilId);
                toast.success("Acesso removido.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Não foi possível remover o acesso.");
              }
            });
          }}
          className="text-[12.5px] font-bold text-bad hover:underline disabled:opacity-50"
        >
          Remover acesso
        </button>
      ) : (
        <span className="text-[11.5px] text-muted-foreground">é você</span>
      )}
    </div>
  );
}
