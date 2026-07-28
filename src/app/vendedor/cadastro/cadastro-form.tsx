"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MailIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { formatPhoneInput } from "@/lib/format";
import { cadastrarVendedor, type CadastroVendedorState } from "./actions";

const initialState: CadastroVendedorState = {};

export function CadastroForm() {
  const [state, formAction, pending] = useActionState(cadastrarVendedor, initialState);
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");

  if (state.aguardandoConfirmacao) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailIcon className="size-8 text-vinho-deep" />
        <h2 className="text-lg font-black">Confira seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Mandamos um link de confirmação. Depois de confirmar, é só entrar
          normalmente com o e-mail e a senha que você acabou de criar.
        </p>
        <Link
          href="/vendedor/entrar"
          className="mt-2 text-sm font-bold text-[var(--brand-vinho-deep)] hover:underline"
        >
          Ir para a tela de entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nome" className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]">
            Nome completo
          </Label>
          <Input id="nome" name="nome" required placeholder="Seu nome completo" />
          {state.fieldErrors?.nome ? (
            <p className="text-xs font-semibold text-bad">{state.fieldErrors.nome}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]">
            E-mail
          </Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          {state.fieldErrors?.email ? (
            <p className="text-xs font-semibold text-bad">{state.fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="senha" className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]">
            Senha
          </Label>
          <Input id="senha" name="senha" type="password" autoComplete="new-password" required />
          {state.fieldErrors?.senha ? (
            <p className="text-xs font-semibold text-bad">{state.fieldErrors.senha}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefone" className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]">
            Celular cadastrado pela coordenação
          </Label>
          <Input
            id="telefone"
            name="telefone"
            inputMode="numeric"
            placeholder="(33) 98820-3127"
            value={telefone}
            onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
            required
          />
          {state.fieldErrors?.telefone ? (
            <p className="text-xs font-semibold text-bad">{state.fieldErrors.telefone}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="codigo_vinculo" className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]">
            Código de vínculo
          </Label>
          <Input
            id="codigo_vinculo"
            name="codigo_vinculo"
            maxLength={6}
            placeholder="K7X2QP"
            className="text-center font-black uppercase tracking-[0.3em]"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            required
          />
          <p className="text-[11.5px] text-muted-foreground">
            Repassado pela coordenação — sem ele, o celular sozinho não
            libera o acesso.
          </p>
          {state.fieldErrors?.codigo_vinculo ? (
            <p className="text-xs font-semibold text-bad">{state.fieldErrors.codigo_vinculo}</p>
          ) : null}
        </div>

        {state.error ? (
          <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
            {state.error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="mt-2 bg-cereja text-white font-extrabold hover:bg-[var(--brand-vinho-deep)]"
        >
          {pending ? "Criando conta..." : "Vincular minha conta"}
        </Button>
      </form>

      <div className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleSigninButton next="/vendedor" label="Continuar com Google" />

      <p className="mt-1 text-center text-[13px] text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/vendedor/entrar" className="font-bold text-[var(--brand-vinho-deep)] hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
