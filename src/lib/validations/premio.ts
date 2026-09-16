import { z } from "zod";

export const premioSchema = z.object({
  categoria: z.enum(
    ["cartela_sorteada", "maior_vendedor", "vendedor_cartela_premiada", "outro"],
    { message: "Escolha a quem o prêmio se destina." },
  ),
  titulo: z
    .string()
    .trim()
    .min(3, "Descreva o prêmio (ex.: Uma moto 0km).")
    .max(120, "Título muito longo — use a descrição para os detalhes."),
  descricao: z.string().trim().max(400, "Descrição muito longa.").optional(),
  // Campo de dinheiro vazio chega como "" e `z.coerce.number()` transformaria
  // isso em 0 — um prêmio "de R$ 0,00", que é diferente de "sem valor
  // declarado" — a paróquia pode não querer publicar o valor de um prêmio.
  valor: z
    .union([z.literal(""), z.coerce.number().min(0, "Valor inválido.")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  quantidade: z.coerce
    .number()
    .int("Quantidade precisa ser um número inteiro.")
    .min(1, "Quantidade mínima é 1.")
    .max(99, "Quantidade máxima é 99."),
  exibir_publico: z.coerce.boolean(),
});

export type PremioInput = z.infer<typeof premioSchema>;
