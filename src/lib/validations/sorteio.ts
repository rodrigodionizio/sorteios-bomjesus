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
  })
  .refine((data) => data.cartela_max > data.cartela_min, {
    message: "A cartela final deve ser maior que a inicial.",
    path: ["cartela_max"],
  });

export type SorteioInput = z.infer<typeof sorteioSchema>;
