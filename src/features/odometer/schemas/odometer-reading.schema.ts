import { z } from "zod";

import { ODOMETER_LIMITS } from "@/features/odometer/domain/odometer-reading";
import { isoDate } from "@/lib/date";

const recordedAtField = z.string().transform((raw, ctx) => {
  try {
    return isoDate(raw);
  } catch {
    ctx.addIssue({ code: "custom", message: "Некоректна дата" });
    return z.NEVER;
  }
});

const odometerField = z.string().transform((raw, ctx): number => {
  // Пробіг вводять цілими кілометрами; пробіли всередині («152 340») люди
  // ставлять за звичкою з калькулятора, тож приймаємо і їх.
  const normalized = raw.replace(/\s/g, "");

  if (!/^\d+$/.test(normalized)) {
    ctx.addIssue({
      code: "custom",
      message: "Пробіг: очікуються цілі кілометри",
    });
    return z.NEVER;
  }

  const value = Number(normalized);

  if (value < ODOMETER_LIMITS.min) {
    ctx.addIssue({
      code: "custom",
      message: "Пробіг: має бути більше за нуль",
    });
    return z.NEVER;
  }

  if (value > ODOMETER_LIMITS.max) {
    ctx.addIssue({ code: "custom", message: "Пробіг: схоже на помилку вводу" });
    return z.NEVER;
  }

  return value;
});

const noteField = z
  .string()
  .max(ODOMETER_LIMITS.note.maxLength, "Нотатка задовга")
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

export const saveOdometerReadingSchema = z.object({
  recordedAt: recordedAtField,
  odometerKm: odometerField,
  note: noteField,
  /**
   * Підтвердження підозрілого значення.
   *
   * Перший запит іде без нього; якщо показання виглядає дивно, сервіс
   * повертає попередження, а користувач вирішує — виправити чи зберегти як є.
   */
  confirmed: z.boolean().optional().default(false),
});

export const deleteOdometerReadingSchema = z.object({
  id: z.uuid("Некоректний ідентифікатор"),
});

export type OdometerReadingFormValues = z.input<
  typeof saveOdometerReadingSchema
>;
export type SaveOdometerReadingInput = z.infer<
  typeof saveOdometerReadingSchema
>;
