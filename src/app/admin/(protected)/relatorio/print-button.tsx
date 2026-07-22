"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
    >
      Imprimir / salvar PDF
    </Button>
  );
}
