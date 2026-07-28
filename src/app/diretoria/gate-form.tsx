"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { confirmarAcessoDiretoria, type AcessoDiretoriaState } from "./actions";

const initialState: AcessoDiretoriaState = {};

export function GateForm({ sorteioId }: { sorteioId: string }) {
  const action = confirmarAcessoDiretoria.bind(null, sorteioId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-vinho to-vinho-deep px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center text-bege">
          <Image
            src="/brand/logo-simbolo-mono-claro.svg"
            alt="Sorteios Bom Jesus"
            width={48}
            height={48}
            priority
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bege/70">
              Paróquia Senhor Bom Jesus
            </p>
            <h1 className="text-2xl font-black">Painel da Diretoria</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-bege/15 bg-white p-7 shadow-2xl">
          <p className="mb-4.5 text-sm text-muted-foreground">
            Este link é exclusivo para a diretoria e a tesouraria
            acompanharem o resultado do sorteio. Digite o código de acesso
            para continuar — o navegador vai lembrar dele nas próximas
            visitas.
          </p>

          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="codigo"
                className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]"
              >
                Código de acesso
              </Label>
              <Input
                id="codigo"
                name="codigo"
                maxLength={6}
                required
                autoFocus
                placeholder="K7X2QP"
                className="text-center text-lg font-black uppercase tracking-[0.3em]"
              />
            </div>

            {state.error ? (
              <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
                {state.error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
            >
              {pending ? "Confirmando..." : "Confirmar acesso"}
            </Button>
          </form>

          <p className="mt-4 text-center text-[11.5px] text-muted-foreground">
            Não tem o código? Fale com a coordenação do sorteio.
          </p>
        </div>
      </div>
    </div>
  );
}
