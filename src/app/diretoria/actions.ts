"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DIRETORIA_COOKIE_NAME as COOKIE_NAME } from "./constants";

export type AcessoDiretoriaState = {
  error?: string;
};

export async function confirmarAcessoDiretoria(
  sorteioId: string,
  _prevState: AcessoDiretoriaState,
  formData: FormData,
): Promise<AcessoDiretoriaState> {
  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();

  if (!codigo) {
    return { error: "Digite o código de acesso." };
  }

  const supabase = await createClient();
  const { data: valido, error } = await supabase.rpc("fn_confirmar_acesso_diretoria", {
    p_sorteio_id: sorteioId,
    p_codigo: codigo,
  });

  if (error || !valido) {
    return { error: "Código inválido — confira com a coordenação do sorteio." };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, codigo, {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/diretoria");
}
