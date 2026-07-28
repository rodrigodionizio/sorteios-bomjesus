import { z } from "zod";

const telefoneSchema = z
  .string()
  .trim()
  .regex(/^\(\d{2}\)\s?9\d{4}-?\d{4}$/, "Use o formato (99) 99999-9999.");

const codigoVinculoSchema = z
  .string()
  .trim()
  .length(6, "O código de vínculo tem 6 caracteres.")
  .transform((v) => v.toUpperCase());

export const vendedorLoginSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

export const vendedorCadastroSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
  telefone: telefoneSchema,
  codigo_vinculo: codigoVinculoSchema,
});
export type VendedorCadastroInput = z.infer<typeof vendedorCadastroSchema>;

export const vendedorVincularSchema = z.object({
  telefone: telefoneSchema,
  codigo_vinculo: codigoVinculoSchema,
});
export type VendedorVincularInput = z.infer<typeof vendedorVincularSchema>;
