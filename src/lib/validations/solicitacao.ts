import { z } from "zod";

export const solicitacaoSchema = z
  .object({
    lote_id: z.string().uuid("Selecione um lote."),
    numero_inicial: z.coerce.number().int().min(1),
    numero_final: z.coerce.number().int().min(1),
    forma_alegada: z.enum(["dinheiro", "pix", "transferencia"]),
    observacao: z
      .string()
      .trim()
      .max(500, "Máximo de 500 caracteres.")
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((d) => d.numero_final >= d.numero_inicial, {
    message: "O número final deve ser maior ou igual ao inicial.",
    path: ["numero_final"],
  });

export type SolicitacaoInput = z.infer<typeof solicitacaoSchema>;
