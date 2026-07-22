import { z } from "zod";

export const vendedorSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  telefone: z
    .string()
    .trim()
    .regex(/^\(\d{2}\)\s?9\d{4}-?\d{4}$/, "Use o formato (99) 99999-9999."),
});

export type VendedorInput = z.infer<typeof vendedorSchema>;
