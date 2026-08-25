import { z } from "zod";

/**
 * Os limites não são estéticos: vêm do padrão EMV do BR Code.
 *   nome_recebedor → campo 59, máx. 25    cidade → campo 60, máx. 15
 *   mensagem       → vira o txid (62-05), que só aceita [A-Za-z0-9]
 *
 * A mensagem para em 20 para sobrar espaço: o txid impresso é
 * `mensagem + número da cartela`, e o total não pode passar de 25.
 */
export const pixChaveSchema = z.object({
  apelido: z.string().trim().min(2, "Dê um apelido para identificar a chave."),
  tipo: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"], {
    message: "Escolha o tipo da chave.",
  }),
  chave: z.string().trim().min(3, "Informe a chave Pix."),
  nome_recebedor: z
    .string()
    .trim()
    .min(2, "Informe o nome que aparece para quem paga.")
    .max(25, "Máximo de 25 caracteres (limite do Pix)."),
  cidade: z
    .string()
    .trim()
    .min(2, "Informe a cidade.")
    .max(15, "Máximo de 15 caracteres (limite do Pix)."),
  mensagem: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{1,20}$/, "Use até 20 letras e números, sem espaço, acento ou hífen.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  banco: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
  padrao: z.coerce.boolean().optional(),
});

export type PixChaveInput = z.infer<typeof pixChaveSchema>;
