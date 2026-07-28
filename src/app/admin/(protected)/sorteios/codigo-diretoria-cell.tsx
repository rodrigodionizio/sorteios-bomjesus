"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { regenerarCodigoDiretoria } from "./actions";

export function CodigoDiretoriaCell({
  sorteioId,
  codigoAtual,
}: {
  sorteioId: string;
  codigoAtual: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [mostrar, setMostrar] = useState(false);
  const [codigo, setCodigo] = useState(codigoAtual);

  return (
    <div className="flex items-center justify-end gap-2.5">
      {codigo ? (
        <>
          <span className="font-mono text-[12.5px] font-bold tracking-[0.15em] text-vinho-deep">
            {mostrar ? codigo : "••••••"}
          </span>
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            className="text-[11.5px] font-bold text-muted-foreground hover:underline"
          >
            {mostrar ? "ocultar" : "mostrar"}
          </button>
        </>
      ) : (
        <span className="text-[11.5px] text-muted-foreground">sem código ainda</span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              const novoCodigo = await regenerarCodigoDiretoria(sorteioId);
              setCodigo(novoCodigo);
              setMostrar(true);
              toast.success(`Código do painel da diretoria: ${novoCodigo}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Não foi possível gerar o código.");
            }
          });
        }}
        className="text-[11.5px] font-bold text-vinho-deep hover:underline disabled:opacity-50"
      >
        {pending ? "gerando..." : codigo ? "gerar novo" : "gerar código"}
      </button>
    </div>
  );
}
