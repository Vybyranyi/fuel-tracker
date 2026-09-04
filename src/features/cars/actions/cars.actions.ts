"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createCarSchema } from "@/features/cars/schemas/car.schema";
import * as service from "@/features/cars/services/cars.service";
import { actionClient } from "@/lib/safe-action";

export const createCarAction = actionClient
  .inputSchema(createCarSchema)
  .action(async ({ parsedInput }) => {
    await service.createCar(parsedInput);

    // Усі сторінки показують дані активного авто, тож після появи нового
    // застарілим стає кеш усього застосунку, а не якоїсь однієї сторінки.
    revalidatePath("/", "layout");
    redirect("/");
  });
