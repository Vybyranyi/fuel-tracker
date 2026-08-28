import { z } from "zod";

import { monthKey } from "@/lib/date";

/**
 * Місяць для вивантаження.
 *
 * Перевіряємо шаблоном тут, а не покладаємось на виняток із `monthKey`: так
 * дані з браузера відсіюються на межі, зі зрозумілим повідомленням, а не
 * падають глибше вже як збій.
 */
export const exportMonthSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
      error: "Очікується місяць у форматі YYYY-MM",
    })
    .transform(monthKey),
});
