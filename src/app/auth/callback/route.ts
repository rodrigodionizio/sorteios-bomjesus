import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback do OAuth (Google) — compartilhado entre admin e vendedor.
 * `next` já vem com o destino certo desde quem iniciou o login
 * (`/admin` ou `/vendedor`); se a conta ainda não tiver `perfis`, o
 * layout protegido de cada área é quem decide para onde mandar (aviso
 * de "sem acesso" no admin, `/vendedor/vincular` no vendedor) — este
 * callback só troca o código pela sessão e redireciona.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const safeNext = next.startsWith("/admin") || next.startsWith("/vendedor") ? next : "/admin";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
