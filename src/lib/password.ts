import { z } from "zod";

/** Política de senha alinhada ao Supabase Auth (password_min_length = 10). */
export const PASSWORD_MIN_LENGTH = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(128, "A senha deve ter no máximo 128 caracteres")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "A senha deve conter letra maiúscula, minúscula e número",
  );

export const PASSWORD_HINT =
  `Mínimo ${PASSWORD_MIN_LENGTH} caracteres, com letra maiúscula, minúscula e número`;
