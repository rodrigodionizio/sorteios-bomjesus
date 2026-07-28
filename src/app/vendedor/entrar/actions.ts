"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginVendedorState = {
  error?: string;
};

export async function loginVendedor(
  _prevState: LoginVendedorState,
  formData: FormData,
): Promise<LoginVendedorState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/vendedor");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  redirect(next.startsWith("/vendedor") ? next : "/vendedor");
}
