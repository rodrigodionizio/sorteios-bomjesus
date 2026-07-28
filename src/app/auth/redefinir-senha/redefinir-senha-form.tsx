"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function RedefinirSenhaForm() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
      });

      if (updateError) {
        setError(
          "Não foi possível redefinir a senha — o link pode ter expirado. Peça um novo link em \"Esqueci minha senha\".",
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: perfil } = user
        ? await supabase.from("perfis").select("role").eq("id", user.id).single()
        : { data: null };

      router.push(perfil?.role === "vendedor" ? "/vendedor" : "/admin");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="senha"
          className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]"
        >
          Nova senha
        </Label>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="confirmar"
          className="text-xs font-bold uppercase tracking-wide text-[var(--brand-vinho-deep)]"
        >
          Confirmar nova senha
        </Label>
        <Input
          id="confirmar"
          type="password"
          autoComplete="new-password"
          required
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 bg-cereja text-white font-extrabold hover:bg-[var(--brand-vinho-deep)]"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
