import { z } from "zod";

export const baixaSchema = z.object({
  lote_id: z.string().uuid(),
  numero_inicial: z.coerce.number().int().min(1),
  numero_final: z.coerce.number().int().min(1),
  forma_confirmacao: z.enum(["dinheiro", "pix", "confirmacao_vendedor", "ambos"]),
}).refine((d) => d.numero_final >= d.numero_inicial, {
  message: "O número final deve ser maior ou igual ao inicial.",
  path: ["numero_final"],
});

export type BaixaInput = z.infer<typeof baixaSchema>;
