"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VendorPicker({
  vendedores,
  currentId,
}: {
  vendedores: { id: string; nome: string }[];
  currentId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("vendedor", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={currentId} onValueChange={onChange}>
      <SelectTrigger className="w-full max-w-sm border-border bg-secondary py-5 text-base font-bold">
        <SelectValue placeholder="Selecione um vendedor">
          {(value: string | null) =>
            vendedores.find((v) => v.id === value)?.nome ?? "Selecione um vendedor"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {vendedores.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            {v.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
