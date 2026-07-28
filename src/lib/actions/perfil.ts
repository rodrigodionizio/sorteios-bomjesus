"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { perfilSchema } from "@/lib/validations/perfil";

export type PerfilFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

/**
 * Atualiza só `display_name`/`cargo` da própria conta — compartilhada
 * entre `/admin/conta` e `/vendedor/conta`. Mudar `role` por aqui é
 * bloqueado no banco (trigger `trg_perfil_role_protect`, ver
 * schema-v3-usuarios-perfis-vendedores.sql), então nem precisa ser
 * checado no código: o `update` abaixo nunca inclui `role`.
 */
export async function updateMeuPerfil(
  _prevState: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const parsed = perfilSchema.safeParse({
    display_name: formData.get("display_name"),
    cargo: formData.get("cargo"),
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

  if (!user) {
    return { error: "Sua sessão expirou — entre novamente." };
  }

  const { error } = await supabase
    .from("perfis")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/admin/conta");
  revalidatePath("/vendedor/conta");
  revalidatePath("/admin");
  revalidatePath("/vendedor");
  return { success: true };
}
