import { z } from "zod";

import {
  computeItemAmount,
  SERVICE_ITEM_KINDS,
} from "@/features/service/domain/service-record";
import { isoDate } from "@/lib/date";
import { decimal2, parseDecimal2, type Decimal2 } from "@/lib/units";

/**
 * Числа їдуть десятковими рядками ("389.90"), а не «сотими» — так само, як у
 * заправці: це те саме, що зберігає `numeric`, і те саме, що бачить людина.
 */
function decimalField(options: {
  label: string;
  min: Decimal2;
  max: Decimal2;
}) {
  return z.string().transform((raw, ctx): Decimal2 => {
    const parsed = parseDecimal2(raw);

    if (parsed === null) {
      ctx.addIssue({
        code: "custom",
        message: `${options.label}: очікується число`,
      });
      return z.NEVER;
    }

    if (parsed < options.min || parsed > options.max) {
      ctx.addIssue({
        code: "custom",
        message: `${options.label}: схоже на помилку`,
      });
      return z.NEVER;
    }

    return parsed;
  });
}

const performedAtField = z.string().transform((raw, ctx) => {
  try {
    return isoDate(raw);
  } catch {
    ctx.addIssue({ code: "custom", message: "Некоректна дата" });
    return z.NEVER;
  }
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Не більше ${max} символів`)
    .transform((value) => value || null)
    .nullable()
    .default(null);

export const serviceItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Без назви позицію не впізнати")
    .max(80, "Не більше 80 символів"),
  quantity: decimalField({
    label: "Кількість",
    min: decimal2(1),
    max: decimal2(100_000),
  }),
  unitPrice: decimalField({
    label: "Ціна",
    // Нуль дозволений: гарантійна заміна коштує нічого, але в списку має бути.
    min: decimal2(0),
    max: decimal2(10_000_000),
  }),
  kind: z.enum(SERVICE_ITEM_KINDS as [string, ...string[]]),
});

export const saveServiceRecordSchema = z.object({
  performedAt: performedAtField,
  odometerKm: z
    .string()
    .transform((raw, ctx) => {
      if (raw.trim() === "") return null;

      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 10_000_000) {
        ctx.addIssue({ code: "custom", message: "Пробіг: очікується число" });
        return z.NEVER;
      }

      return parsed;
    })
    .nullable()
    .default(null),
  vendor: optionalText(80),
  note: optionalText(280),
  items: z
    .array(serviceItemSchema)
    .min(1, "Додайте хоча б одну позицію")
    .max(50, "Забагато позицій для одного запису"),
});

export const updateServiceRecordSchema = saveServiceRecordSchema.extend({
  id: z.uuid("Неправильний ідентифікатор"),
});

export const deleteServiceRecordSchema = z.object({
  id: z.uuid("Неправильний ідентифікатор"),
});

export type ServiceItemInput = z.infer<typeof serviceItemSchema>;
export type SaveServiceRecordInput = z.infer<typeof saveServiceRecordSchema>;
export type UpdateServiceRecordInput = z.infer<
  typeof updateServiceRecordSchema
>;

/**
 * Дораховує суму кожної позиції.
 *
 * Саме на сервері, а не в формі: те, що прийшло з браузера, — лише кількість
 * і ціна, а сума завжди похідна. Якби її приймали ззовні, у базу можна було б
 * покласти рядок, у якому 2 × 100 дорівнює мільйону.
 */
export function withComputedAmounts(input: SaveServiceRecordInput) {
  return input.items.map((item, index) => ({
    ...item,
    position: index,
    amount: computeItemAmount(item.quantity, item.unitPrice),
  }));
}
