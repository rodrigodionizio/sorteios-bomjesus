"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validarPlanilha, importarLinhas } from "./actions";
import type { ValidationReport } from "./types";

export function ImportarForm() {
  const [aba, setAba] = useState<"reservas" | "baixas">("reservas");
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [pending, startTransition] = useTransition();
  const [importing, startImporting] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.set("arquivo", file);
    startTransition(async () => {
      const result = await validarPlanilha(aba, formData);
      setReport(result);
      if (result.erro) toast.error(result.erro);
    });
  }

  function handleImport() {
    if (!report) return;
    startImporting(async () => {
      const result = await importarLinhas(aba, report.reservas, report.baixas);
      if (result.erro) {
        toast.error(`Falha ao importar: ${result.erro}`);
        return;
      }
      toast.success(`${result.importadas} linha(s) importada(s) com sucesso.`);
      setReport(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  const rows = report ? (aba === "reservas" ? report.reservas : report.baixas) : [];
  const ok = rows.filter((r) => r.status === "ok").length;
  const erros = rows.filter((r) => r.status === "erro").length;

  return (
    <div>
      <div className="mb-4.5 inline-flex gap-0.5 rounded-lg border border-border bg-secondary p-0.5">
        {(["reservas", "baixas"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => {
              setAba(a);
              setReport(null);
            }}
            className={cn(
              "rounded-md px-4.5 py-2 text-[13.5px] font-bold capitalize",
              aba === a ? "bg-vinho text-bege" : "text-muted-foreground",
            )}
          >
            Aba {a}
          </button>
        ))}
      </div>

      <label
        htmlFor="arquivo"
        className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-secondary px-5 py-9 text-center"
      >
        <span className="text-3xl">📄</span>
        <span className="text-[15px] font-extrabold">
          {report?.arquivo || "Clique para selecionar a planilha (.xlsx)"}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {pending
            ? "Lendo e validando..."
            : report
              ? `${rows.length} linha(s) encontradas na aba "${aba === "reservas" ? "Reservas" : "Baixas"}"`
              : `Envie o arquivo preenchido a partir do modelo de contingência`}
        </span>
        <input
          ref={fileInputRef}
          id="arquivo"
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {report && !report.erro ? (
        <>
          <div className="my-4.5 flex gap-5">
            <Stat label="linhas prontas" value={ok} good />
            <Stat label="com conflito" value={erros} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-secondary text-left text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Linha</th>
                  <th className="px-3 py-2">Vendedor</th>
                  <th className="px-3 py-2">Intervalo</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.linha}
                    className={cn("border-t border-border", r.status === "erro" && "bg-bad-bg")}
                  >
                    <td className="px-3 py-2 tabular-nums font-bold">{r.linha}</td>
                    <td className="px-3 py-2">{r.vendedor_nome}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.numero_inicial === r.numero_final
                        ? r.numero_inicial
                        : `${r.numero_inicial}–${r.numero_final}`}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === "ok" ? (
                        <span className="font-bold text-good">✓ Pronta</span>
                      ) : (
                        <div>
                          <span className="font-bold text-bad">✕ Conflito</span>
                          <span className="mt-0.5 block text-[11.5px] font-semibold text-bad">
                            {r.erro}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4.5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted-foreground">
              As linhas com conflito ficam de fora — corrija na planilha e
              reenvie só elas.
            </p>
            <Button
              disabled={ok === 0 || importing}
              onClick={handleImport}
              className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
            >
              {importing ? "Importando..." : `Importar ${ok} linhas válidas`}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: number; good?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-xl font-black tabular-nums", good ? "text-good" : "text-bad")}>
        {value}
      </span>
      <span className="text-[13.5px] font-bold">{label}</span>
    </div>
  );
}
