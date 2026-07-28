"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { vendedorVincularSchema } from "@/lib/validations/vendedor-auth";

export type VincularState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function vincularConta(
  _prevState: VincularState,
  formData: FormData,
): Promise<VincularState> {
  const parsed = vendedorVincularSchema.safeParse({
    telefone: formData.get("telefone"),
    codigo_vinculo: formData.get("codigo_vinculo"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { data: vinculou, error } = await supabase.rpc("fn_vincular_vendedor", {
    p_telefone: parsed.data.telefone,
    p_codigo: parsed.data.codigo_vinculo,
  });

  if (error) {
    return { error: `Não foi possível vincular: ${error.message}` };
  }

  if (!vinculou) {
    return {
      error: "Não encontramos um vendedor com esse celular e código — confira com a coordenação.",
    };
  }

  redirect("/vendedor");
}
