import { z } from "zod";

export const conviteSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("E-mail inválido."),
});

export type ConviteInput = z.infer<typeof conviteSchema>;
