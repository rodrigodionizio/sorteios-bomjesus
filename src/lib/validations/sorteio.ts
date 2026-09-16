import { z } from "zod";

export const sorteioSchema = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome do sorteio."),
    descricao: z.string().trim().optional(),
    cartela_min: z.coerce.number().int().min(1, "Mínimo inválido."),
    cartela_max: z.coerce.number().int().min(1, "Máximo inválido."),
    preco_cartela: z.coerce
      .number()
      .positive("Informe um preço maior que zero."),
    data_sorteio: z.string().trim().optional(),
    // Regra 22: todo sorteio nasce com o prêmio principal. O banco recusa
    // sem ele (`fn_criar_sorteio`); a validação aqui só adianta a mensagem.
    premio_titulo: z
      .string()
      .trim()
      .min(3, "Todo sorteio precisa de um prêmio principal. Informe qual é.")
      .max(120, "Título muito longo — use o detalhe."),
    premio_descricao: z.string().trim().max(400, "Detalhe muito longo.").optional(),
    // Vazio chega como "": sem isto `coerce` viraria "R$ 0,00", que é
    // diferente de "sem valor declarado".
    premio_valor: z
      .union([z.literal(""), z.coerce.number().min(0, "Valor inválido.")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
  })
  .refine((data) => data.cartela_max > data.cartela_min, {
    message: "A cartela final deve ser maior que a inicial.",
    path: ["cartela_max"],
  });

export type SorteioInput = z.infer<typeof sorteioSchema>;
