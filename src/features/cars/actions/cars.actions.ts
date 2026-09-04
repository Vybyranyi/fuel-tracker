"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createCarSchema } from "@/features/cars/schemas/car.schema";
import * as service from "@/features/cars/services/cars.service";
import { actionClient } from "@/lib/safe-action";

const carIdSchema = z.object({ id: z.uuid("Неправильний ідентифікатор авто") });

/**
 * Усі сторінки показують дані активного авто, тож застарілим після будь-якої
 * зміни стає кеш усього застосунку, а не якоїсь однієї сторінки.
 */
function revalidateEverything(): void {
  revalidatePath("/", "layout");
}

export const createCarAction = actionClient
  .inputSchema(createCarSchema)
  .action(async ({ parsedInput }) => {
    await service.createCar(parsedInput);
    revalidateEverything();
    redirect("/");
  });

export const updateCarAction = actionClient
  .inputSchema(createCarSchema.extend(carIdSchema.shape))
  .action(async ({ parsedInput: { id, ...input } }) => {
    await service.updateCar(id, input);
    revalidateEverything();
    redirect("/cars");
  });

export const deleteCarAction = actionClient
  .inputSchema(carIdSchema)
  .action(async ({ parsedInput }) => {
    await service.deleteCar(parsedInput.id);
    revalidateEverything();
    // Не redirect: авто могло бути останнім, і тоді оболонка `(app)` сама
    // відведе на створення нового. Куди саме — вирішує вона, а не ця дія.
    return { id: parsedInput.id };
  });

export const switchCarAction = actionClient
  .inputSchema(carIdSchema)
  .action(async ({ parsedInput }) => {
    await service.switchCar(parsedInput.id);
    revalidateEverything();
    return { id: parsedInput.id };
  });
