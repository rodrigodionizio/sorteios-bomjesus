"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownIcon, LockIcon, StarIcon, TriangleAlertIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { definirPremioPrincipal } from "./actions";

type PremioResumo = { id: string; titulo: string };

type Passo = "rebaixar" | "promover";

/**
 * Prêmio principal do sorteio — regra 22.
 *
 * TROCA EM DOIS PASSOS, como a coordenação definiu: primeiro rebaixar o
 * atual, depois promover o novo, com os riscos à vista em cada um. Os dois
 * passos são da TELA; no banco eles acontecem juntos, numa só transação
 * (`fn_definir_premio_principal`), porque o sorteio não pode existir sem
 * prêmio principal nem por um instante.
 */
export function PremioPrincipalCell({
  sorteioId,
  principal,
  candidatos,
  apurado,
}: {
  sorteioId: string;
  principal: PremioResumo | null;
  /** Prêmios de cartela sorteada que podem ser promovidos. */
  candidatos: PremioResumo[];
  apurado: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [passo, setPasso] = useState<Passo>(principal ? "rebaixar" : "promover");
  const [cienteRebaixar, setCienteRebaixar] = useState(false);
  const [cientePromover, setCientePromover] = useState(false);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const novo = candidatos.find((c) => c.id === escolhido);

  function abrir() {
    setPasso(principal ? "rebaixar" : "promover");
    setCienteRebaixar(false);
    setCientePromover(false);
    setEscolhido(null);
    setOpen(true);
  }

  function confirmar() {
    if (!escolhido) return;
    startTransition(async () => {
      try {
        await definirPremioPrincipal(escolhido, sorteioId);
        toast.success(
          principal ? "Prêmio principal trocado." : "Prêmio principal definido.",
        );
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
      }
    });
  }

  if (apurado) {
    return (
      <span className="inline-flex max-w-[16rem] items-center gap-1.5 text-[12.5px] font-bold">
        <LockIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate" title="Sorteio já apurado: o prêmio principal não pode mais ser trocado.">
          {principal?.titulo ?? "—"}
        </span>
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex max-w-[18rem] flex-col items-start gap-1">
        {principal ? (
          <span className="inline-flex max-w-full items-center gap-1 text-[12.5px] font-bold">
            <StarIcon className="size-3.5 shrink-0 text-dourado-deep" />
            <span className="truncate">{principal.titulo}</span>
          </span>
        ) : (
          <span className="rounded-full bg-bad-bg px-2 py-0.5 text-[11px] font-black text-bad">
            não definido
          </span>
        )}
        <button
          type="button"
          onClick={abrir}
          className="text-[11.5px] font-bold text-vinho-deep hover:underline"
        >
          {principal ? "trocar prêmio principal" : "definir prêmio principal"}
        </button>
      </div>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {!principal
              ? "Definir o prêmio principal"
              : passo === "rebaixar"
                ? "Passo 1 de 2 — Rebaixar o prêmio principal atual"
                : "Passo 2 de 2 — Promover o novo prêmio principal"}
          </DialogTitle>
        </DialogHeader>

        {candidatos.length === 0 ? (
          <div className="flex flex-col gap-3 text-[13.5px]">
            <p>
              {principal
                ? "Não há outro prêmio de cartela sorteada para promover."
                : "Este sorteio não tem prêmio de cartela sorteada cadastrado."}{" "}
              O prêmio principal precisa ser de cartela sorteada.
            </p>
            <Link
              href={`/admin/sorteios/${sorteioId}/premios`}
              className="font-bold text-vinho-deep underline"
            >
              Cadastrar prêmio de cartela sorteada
            </Link>
          </div>
        ) : principal && passo === "rebaixar" ? (
          <>
            <div className="rounded-xl border border-border bg-secondary px-4 py-3">
              <div className="text-[10.5px] font-black uppercase tracking-wide text-muted-foreground">
                Prêmio principal atual
              </div>
              <div className="mt-0.5 text-[15.5px] font-black">{principal.titulo}</div>
              <div className="mt-1 text-[12.5px] text-muted-foreground">
                Continuará no sorteio, como prêmio de cartela sorteada comum.
              </div>
            </div>

            <Riscos />

            <Ciente
              checked={cienteRebaixar}
              onChange={setCienteRebaixar}
              texto={`Entendo os riscos de rebaixar "${principal.titulo}".`}
            />

            <DialogFooter className="-mx-0 -mb-0 rounded-none border-none bg-transparent p-0 sm:justify-end">
              <Button type="button" variant="outline" className="border-border font-bold" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!cienteRebaixar}
                onClick={() => setPasso("promover")}
                className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
              >
                Continuar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                {principal ? "Qual prêmio passa a ser o principal?" : "Qual é o prêmio principal?"}
              </legend>
              {candidatos.map((c) => (
                <label
                  key={c.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[14px] font-bold ${
                    escolhido === c.id ? "border-vinho bg-bege/60" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="novo_principal"
                    value={c.id}
                    checked={escolhido === c.id}
                    onChange={() => setEscolhido(c.id)}
                    className="size-4 accent-[var(--brand-cereja)]"
                  />
                  {c.titulo}
                </label>
              ))}
            </fieldset>

            {principal && novo ? (
              <div className="rounded-xl border border-dourado-deep/35 bg-bege/50 px-4 py-3 text-[13px]">
                <div className="text-muted-foreground line-through">{principal.titulo}</div>
                <ArrowDownIcon className="my-1 size-3.5 text-dourado-deep" />
                <div className="inline-flex items-center gap-1 font-black">
                  <StarIcon className="size-3.5 text-dourado-deep" /> {novo.titulo}
                </div>
              </div>
            ) : null}

            {!principal ? <Riscos /> : null}

            <Ciente
              checked={cientePromover}
              onChange={setCientePromover}
              texto={
                novo
                  ? `Confirmo que "${novo.titulo}" é o prêmio principal deste sorteio.`
                  : "Escolha o prêmio acima."
              }
              disabled={!novo}
            />

            <DialogFooter className="-mx-0 -mb-0 rounded-none border-none bg-transparent p-0 sm:justify-end">
              {principal ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-border font-bold"
                  onClick={() => setPasso("rebaixar")}
                  disabled={pending}
                >
                  Voltar
                </Button>
              ) : (
                <Button type="button" variant="outline" className="border-border font-bold" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                disabled={!novo || !cientePromover || pending}
                onClick={confirmar}
                className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
              >
                {pending ? "Salvando..." : principal ? "Confirmar troca" : "Definir prêmio principal"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Riscos() {
  return (
    <div className="rounded-xl border border-bad/30 bg-bad-bg px-4 py-3 text-[13px] text-bad">
      <div className="mb-1.5 flex items-center gap-1.5 font-black">
        <TriangleAlertIcon className="size-4" /> O que muda com esta ação
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-[12.5px] leading-snug">
        <li>
          O prêmio de <strong>quem vendeu a cartela premiada</strong> passa a ser
          decidido pela cartela sorteada no prêmio principal escolhido.
        </li>
        <li>
          A página inicial e o placar público passam a destacar o novo prêmio
          principal <strong>imediatamente</strong>.
        </li>
        <li>
          Cartazes, cartelas impressas e mensagens já divulgados podem estar
          anunciando outro prêmio como o principal.
        </li>
        <li>A ação fica registrada no histórico de auditoria, com quem fez e quando.</li>
        <li>
          Depois que o primeiro número do sorteio for apurado,{" "}
          <strong>o prêmio principal não poderá mais ser trocado</strong>.
        </li>
      </ul>
    </div>
  );
}

function Ciente({
  checked,
  onChange,
  texto,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  texto: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2.5 text-[13px] font-bold ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[var(--brand-cereja)]"
      />
      {texto}
    </label>
  );
}
