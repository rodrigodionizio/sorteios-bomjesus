"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { solicitacaoSchema } from "@/lib/validations/solicitacao";

export type SolicitarBaixaState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function solicitarBaixa(
  _prevState: SolicitarBaixaState,
  formData: FormData,
): Promise<SolicitarBaixaState> {
  const parsed = solicitacaoSchema.safeParse({
    lote_id: formData.get("lote_id"),
    numero_inicial: formData.get("numero_inicial"),
    numero_final: formData.get("numero_final"),
    forma_alegada: formData.get("forma_alegada"),
    observacao: formData.get("observacao"),
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

  let comprovante_path: string | null = null;
  const file = formData.get("comprovante");

  if (file instanceof File && file.size > 0) {
    const extensao = file.name.split(".").pop() ?? "jpg";
    const caminho = `${user.id}/${crypto.randomUUID()}.${extensao}`;

    const { error: uploadError } = await supabase.storage
      .from("comprovantes")
      .upload(caminho, file);

    if (uploadError) {
      return { error: `Não foi possível enviar o comprovante: ${uploadError.message}` };
    }

    comprovante_path = caminho;
  }

  const { error } = await supabase.from("solicitacoes_baixa").insert({
    lote_id: parsed.data.lote_id,
    numero_inicial: parsed.data.numero_inicial,
    numero_final: parsed.data.numero_final,
    forma_alegada: parsed.data.forma_alegada,
    observacao: parsed.data.observacao ?? null,
    comprovante_path,
    solicitado_por: user.id,
  });

  if (error) {
    return { error: `Não foi possível enviar a solicitação: ${error.message}` };
  }

  revalidatePath("/vendedor");
  return { success: true };
}
