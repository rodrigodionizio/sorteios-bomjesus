"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { conviteSchema } from "@/lib/validations/convite";

export type ConviteFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function criarConvite(
  _prevState: ConviteFormState,
  formData: FormData,
): Promise<ConviteFormState> {
  const parsed = conviteSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("convites").insert({
    ...parsed.data,
    convidado_por: user?.id ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Já existe um convite pendente para esse e-mail.",
        fieldErrors: { email: "Convite já enviado." },
      };
    }
    return { error: `Não foi possível convidar: ${error.message}` };
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function cancelarConvite(conviteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_convite", {
    p_convite_id: conviteId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}

export async function removerAcesso(perfilId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remover_acesso", {
    p_perfil_id: perfilId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}

export async function alterarPapel(perfilId: string, novoRole: "admin" | "superadmin") {
  const supabase = await createClient();
  const { error } = await supabase.rpc("alterar_papel", {
    p_perfil_id: perfilId,
    p_novo_role: novoRole,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}
