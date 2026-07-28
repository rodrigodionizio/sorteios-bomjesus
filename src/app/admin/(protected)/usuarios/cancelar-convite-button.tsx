"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cancelarConvite } from "./actions";

export function CancelarConviteButton({ conviteId }: { conviteId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await cancelarConvite(conviteId);
            toast.success("Convite cancelado.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Não foi possível cancelar.");
          }
        });
      }}
      className="text-[12.5px] font-bold text-bad hover:underline disabled:opacity-50"
    >
      {pending ? "Cancelando..." : "Cancelar convite"}
    </button>
  );
}
