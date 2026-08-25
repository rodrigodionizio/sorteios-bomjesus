"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { vincularChaveAoSorteio } from "../pix/actions";

/**
 * Um sorteio recebe no máximo uma chave; a mesma chave pode servir a
 * vários sorteios. Por isso é um seletor simples, não uma lista.
 */
export function PixChaveCell({
  sorteioId,
  chaveAtualId,
  chaves,
}: {
  sorteioId: string;
  chaveAtualId: string | null;
  chaves: { id: string; apelido: string }[];
}) {
  const [pending, startTransition] = useTransition();

  if (chaves.length === 0) {
    return <span className="text-[11.5px] text-muted-foreground">nenhuma chave cadastrada</span>;
  }

  return (
    <select
      disabled={pending}
      defaultValue={chaveAtualId ?? ""}
      onChange={(e) => {
        const valor = e.target.value || null;
        startTransition(async () => {
          try {
            await vincularChaveAoSorteio(sorteioId, valor);
            toast.success(valor ? "Chave vinculada ao sorteio." : "Chave desvinculada.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Não foi possível vincular.");
          }
        });
      }}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-[12.5px] disabled:opacity-50"
    >
      <option value="">sem chave</option>
      {chaves.map((c) => (
        <option key={c.id} value={c.id}>
          {c.apelido}
        </option>
      ))}
    </select>
  );
}
