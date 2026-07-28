"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { ForgotPasswordButton } from "@/components/auth/forgot-password-button";
import { loginVendedor, type LoginVendedorState } from "./actions";

const initialState: LoginVendedorState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginVendedor, initialState);
  const emailRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]">
            E-mail
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            ref={emailRef}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]">
              Senha
            </Label>
            <ForgotPasswordButton getEmail={() => emailRef.current?.value ?? ""} />
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
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
          className="mt-2 bg-cereja text-white font-extrabold hover:bg-[var(--brand-vinho-deep)]"
        >
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleSigninButton next="/vendedor" />

      <p className="mt-1 text-center text-[13px] text-muted-foreground">
        Primeira vez aqui?{" "}
        <Link href="/vendedor/cadastro" className="font-bold text-[var(--brand-vinho-deep)] hover:underline">
          Vincule sua conta
        </Link>
      </p>
    </div>
  );
}
