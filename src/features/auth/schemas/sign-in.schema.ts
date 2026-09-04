import { z } from "zod";

/** Скільки цифр у коді з листа. Задає і схему, і кількість клітинок у формі. */
export const EMAIL_CODE_LENGTH = 6;

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Схоже на неправильну адресу" })),
});

export const emailCodeSchema = emailSchema.extend({
  code: z
    .string()
    .regex(
      new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`),
      `Код — це ${EMAIL_CODE_LENGTH} цифр`,
    ),
});

export type EmailInput = z.infer<typeof emailSchema>;
export type EmailCodeInput = z.infer<typeof emailCodeSchema>;
