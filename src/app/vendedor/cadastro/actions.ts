"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { vendedorCadastroSchema } from "@/lib/validations/vendedor-auth";

export type CadastroVendedorState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  aguardandoConfirmacao?: boolean;
};

export async function cadastrarVendedor(
  _prevState: CadastroVendedorState,
  formData: FormData,
): Promise<CadastroVendedorState> {
  const parsed = vendedorCadastroSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
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

  const { nome, email, senha, telefone, codigo_vinculo } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, telefone, codigo_vinculo },
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return {
        error: "Já existe uma conta com esse e-mail — tente entrar em vez de cadastrar.",
        fieldErrors: { email: "E-mail já cadastrado." },
      };
    }
    return { error: `Não foi possível criar a conta: ${error.message}` };
  }

  // Sem sessão = o projeto exige confirmar o e-mail antes de liberar o
  // login (padrão do Supabase Auth) — o vínculo por celular+código já
  // foi tentado pelo trigger na hora do cadastro, mas só terá efeito
  // depois que a pessoa confirmar e entrar de fato.
  if (!data.session) {
    return { aguardandoConfirmacao: true };
  }

  redirect("/vendedor");
}
