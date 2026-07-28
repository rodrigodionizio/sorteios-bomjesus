"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * `getEmail` deixa cada formulário decidir como ler o valor atual do
 * campo de e-mail (ref, state...) sem precisar controlar esse valor
 * por aqui — o componente só sabe disparar o reset.
 */
export function ForgotPasswordButton({ getEmail }: { getEmail: () => string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const email = getEmail().trim();
    if (!email) {
      toast.error("Digite seu e-mail no campo acima primeiro.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/redefinir-senha`,
      });
      // Mensagem genérica de propósito — não revela se o e-mail tem
      // conta ou não, mesmo padrão já usado no erro de login.
      toast.success(
        "Se esse e-mail tiver uma conta, enviamos um link para redefinir a senha.",
      );
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="text-[12px] font-bold text-[var(--brand-vinho-deep)] hover:underline disabled:opacity-50"
    >
      {pending ? "Enviando..." : "Esqueci minha senha"}
    </button>
  );
}
