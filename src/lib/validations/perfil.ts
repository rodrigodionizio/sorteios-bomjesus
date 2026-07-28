import { z } from "zod";

export const perfilSchema = z.object({
  display_name: z
    .string()
    .trim()
    .max(80, "Máximo de 80 caracteres.")
    .optional()
    .transform((v) => (v ? v : null)),
  cargo: z
    .string()
    .trim()
    .max(60, "Máximo de 60 caracteres.")
    .optional()
    .transform((v) => (v ? v : null)),
});

export type PerfilInput = z.infer<typeof perfilSchema>;
