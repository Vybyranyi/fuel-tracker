import { z } from "zod";

import { FUEL_TYPES } from "@/features/cars/domain/car";

/** Порожнє необовʼязкове поле має лягти в базу як NULL, а не як "". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Не більше ${max} символів`)
    .transform((value) => value || null)
    .nullable()
    .default(null);

export const createCarSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Без назви авто не знайти в списку")
    .max(40, "Не більше 40 символів"),
  makeModel: optionalText(60),
  plate: optionalText(16),
  year: z
    .union([z.number(), z.string()])
    .transform((value) => (value === "" ? null : Number(value)))
    .nullable()
    .default(null)
    .refine(
      (value) =>
        value === null ||
        (Number.isInteger(value) && value >= 1900 && value <= 2100),
      "Рік має бути між 1900 і 2100",
    ),
  fuelType: z.enum(FUEL_TYPES as [string, ...string[]]),
});

export type CreateCarInput = z.infer<typeof createCarSchema>;
