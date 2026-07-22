import { z } from "zod";

export const loteSchema = z
  .object({
    vendedor_id: z.string().uuid("Selecione um vendedor."),
    tipo: z.enum(["bloco", "avulsa"]),
    numero_inicial: z.coerce.number().int().min(1),
    numero_final: z.coerce.number().int().min(1),
  })
  .refine((d) => d.numero_final >= d.numero_inicial, {
    message: "O número final deve ser maior ou igual ao inicial.",
    path: ["numero_final"],
  })
  .refine((d) => d.tipo !== "avulsa" || d.numero_final === d.numero_inicial, {
    message: "Cartela avulsa precisa ter número inicial igual ao final.",
    path: ["numero_final"],
  });

export type LoteInput = z.infer<typeof loteSchema>;
