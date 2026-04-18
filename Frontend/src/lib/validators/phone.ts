import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .max(50, "Telefone muito longo")
  .optional()
  .refine((value) => {
    if (!value) return true;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }, "Informe um telefone válido (10-15 dígitos)");
