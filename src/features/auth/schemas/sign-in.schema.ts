import { z } from "zod";

/**
 * Мінімальна довжина пароля.
 *
 * Вісім, а не шість, як у Supabase за замовчуванням: свою межу ми піднімаємо,
 * бо всі паролі проходять через цю форму. Supabase лишається другою лінією —
 * якщо колись зʼявиться інший шлях реєстрації, там спрацює його правило.
 */
export const MIN_PASSWORD_LENGTH = 8;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Схоже на неправильну адресу" }));

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Щонайменше ${MIN_PASSWORD_LENGTH} символів`)
  .max(72, "Задовгий пароль");

export const emailSchema = z.object({ email });

export const credentialsSchema = z.object({ email, password });

export const newPasswordSchema = z
  .object({ password, confirmation: z.string() })
  .refine((value) => value.password === value.confirmation, {
    // Помилка вішається на друге поле: саме там людина щойно друкувала, і
    // саме там очікує побачити, що не так.
    path: ["confirmation"],
    error: "Паролі не збігаються",
  });

export type EmailInput = z.infer<typeof emailSchema>;
export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
