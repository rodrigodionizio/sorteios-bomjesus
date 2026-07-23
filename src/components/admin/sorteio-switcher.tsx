"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setSorteioAtivo } from "@/app/admin/(protected)/actions";
import type { Database } from "@/lib/types/database";

type Sorteio = Database["public"]["Tables"]["sorteios"]["Row"];

export function SorteioSwitcher({
  sorteios,
  currentId,
}: {
  sorteios: Sorteio[];
  currentId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (sorteios.length === 0) return null;

  return (
    <Select
      value={currentId ?? undefined}
      disabled={pending}
      onValueChange={(value) => {
        if (value) startTransition(() => setSorteioAtivo(value));
      }}
    >
      <SelectTrigger className="h-auto rounded-full border-border bg-white px-3.5 py-1.5 text-[13px] font-bold text-vinho-deep shadow-sm">
        <SelectValue placeholder="Selecionar sorteio">
          {(value: string | null) =>
            sorteios.find((s) => s.id === value)?.nome ?? "Selecionar sorteio"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sorteios.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
