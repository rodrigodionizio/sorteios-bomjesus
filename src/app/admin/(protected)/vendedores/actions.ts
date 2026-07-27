"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { vendedorSchema } from "@/lib/validations/vendedor";

export type VendedorFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function createVendedor(
  _prevState: VendedorFormState,
  formData: FormData,
): Promise<VendedorFormState> {
  const parsed = vendedorSchema.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("vendedores").insert(parsed.data);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Já existe um vendedor cadastrado com esse telefone.",
        fieldErrors: { telefone: "Telefone já cadastrado." },
      };
    }
    return { error: `Não foi possível cadastrar: ${error.message}` };
  }

  revalidatePath("/admin/vendedores");
  revalidatePath("/admin");
  return {};
}

export async function updateVendedor(
  vendedorId: string,
  _prevState: VendedorFormState,
  formData: FormData,
): Promise<VendedorFormState> {
  const parsed = vendedorSchema.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendedores")
    .update(parsed.data)
    .eq("id", vendedorId);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Já existe um vendedor cadastrado com esse telefone.",
        fieldErrors: { telefone: "Telefone já cadastrado." },
      };
    }
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/admin/vendedores");
  revalidatePath("/admin");
  revalidatePath("/admin/reservar");
  revalidatePath("/admin/baixa");
  return { success: true };
}

export async function setVendedorAtivo(vendedorId: string, ativo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendedores")
    .update({ ativo })
    .eq("id", vendedorId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/vendedores");
}
