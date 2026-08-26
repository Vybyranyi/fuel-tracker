import { z } from "zod";

import {
  areAmountsConsistent,
  computeTotalCost,
} from "@/features/fuel/domain/fuel-math";
import { FUEL_ENTRY_LIMITS } from "@/features/fuel/domain/fuel-entry";
import { isoDate } from "@/lib/date";
import { formatMoney } from "@/lib/format";
import { parseDecimal2, type Decimal2 } from "@/lib/units";

/**
 * Числа їдуть на сервер десятковими рядками ("40.55"), а не «сотими».
 *
 * По-перше, це те саме, що зберігає `numeric` у Postgres, і те саме, що
 * бачить людина — у devtools і в логах значення читається без перекладу.
 * По-друге, парсер лишається один: і ручний ввід, і те, що прийшло по
 * мережі, проходять через `parseDecimal2`.
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

    if (parsed < options.min) {
      ctx.addIssue({
        code: "custom",
        message: `${options.label}: має бути більше за нуль`,
      });
      return z.NEVER;
    }

    if (parsed > options.max) {
      ctx.addIssue({
        code: "custom",
        message: `${options.label}: схоже на помилку вводу`,
      });
      return z.NEVER;
    }

    return parsed;
  });
}

const filledAtField = z.string().transform((raw, ctx) => {
  try {
    return isoDate(raw);
  } catch {
    ctx.addIssue({ code: "custom", message: "Некоректна дата" });
    return z.NEVER;
  }
});

const noteField = z
  .string()
  .max(FUEL_ENTRY_LIMITS.note.maxLength, "Нотатка задовга")
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

const amountsShape = {
  filledAt: filledAtField,
  volumeLiters: decimalField({
    label: "Обʼєм",
    ...FUEL_ENTRY_LIMITS.volumeLiters,
  }),
  pricePerLiter: decimalField({
    label: "Ціна за літр",
    ...FUEL_ENTRY_LIMITS.pricePerLiter,
  }),
  totalCost: decimalField({
    label: "Сума",
    ...FUEL_ENTRY_LIMITS.totalCost,
  }),
  note: noteField,
};

/**
 * Сума має відповідати обʼєму, помноженому на ціну.
 *
 * Форма рахує це сама, тож у нормальному потоці перевірка мовчить. Вона
 * потрібна для випадків, коли до дії дісталися повз форму — і щоб у базу не
 * потрапив запис, у якому три числа не мають між собою нічого спільного:
 * така заправка тихо зіпсувала б і середню ціну за місяць, і графіки.
 */
function checkAmountsConsistent(
  value: {
    volumeLiters: Decimal2;
    pricePerLiter: Decimal2;
    totalCost: Decimal2;
  },
  ctx: z.RefinementCtx,
): void {
  if (areAmountsConsistent(value)) return;

  const expected = computeTotalCost(value.volumeLiters, value.pricePerLiter);
  ctx.addIssue({
    code: "custom",
    path: ["totalCost"],
    message: `Сума не сходиться з обʼємом і ціною — очікувалось ${formatMoney(expected)}`,
  });
}

/** Створення заправки. */
export const createFuelEntrySchema = z
  .object(amountsShape)
  .superRefine(checkAmountsConsistent);

/** Редагування наявної заправки. */
export const updateFuelEntrySchema = z
  .object({ id: z.uuid("Некоректний ідентифікатор"), ...amountsShape })
  .superRefine(checkAmountsConsistent);

/** Видалення. */
export const deleteFuelEntrySchema = z.object({
  id: z.uuid("Некоректний ідентифікатор"),
});

/**
 * Те, що лежить у полях форми, — рядки до перетворення.
 *
 * Виводиться зі схеми, а не описується окремо: інакше два описи однієї
 * структури рано чи пізно розійшлись би.
 */
export type FuelEntryFormValues = z.input<typeof createFuelEntrySchema>;

export type CreateFuelEntryInput = z.infer<typeof createFuelEntrySchema>;
export type UpdateFuelEntryInput = z.infer<typeof updateFuelEntrySchema>;
export type DeleteFuelEntryInput = z.infer<typeof deleteFuelEntrySchema>;
