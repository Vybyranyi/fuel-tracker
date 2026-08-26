"use server";

import { revalidatePath } from "next/cache";

import {
  createFuelEntrySchema,
  deleteFuelEntrySchema,
  updateFuelEntrySchema,
} from "@/features/fuel/schemas/fuel-entry.schema";
import * as service from "@/features/fuel/services/fuel-entries.service";
import { actionClient } from "@/lib/safe-action";

/**
 * Сторінки, які показують заправки. Після будь-якої зміни їх кеш скидається,
 * інакше список під формою лишався б зі старими даними до перезавантаження.
 */
const AFFECTED_PATHS = ["/", "/stats"] as const;

function revalidateFuelPages(): void {
  for (const path of AFFECTED_PATHS) {
    revalidatePath(path);
  }
}

export const createFuelEntryAction = actionClient
  .inputSchema(createFuelEntrySchema)
  .action(async ({ parsedInput }) => {
    const entry = await service.createFuelEntry(parsedInput);
    revalidateFuelPages();
    return { id: entry.id };
  });

export const updateFuelEntryAction = actionClient
  .inputSchema(updateFuelEntrySchema)
  .action(async ({ parsedInput }) => {
    const entry = await service.updateFuelEntry(parsedInput);
    revalidateFuelPages();
    return { id: entry.id };
  });

export const deleteFuelEntryAction = actionClient
  .inputSchema(deleteFuelEntrySchema)
  .action(async ({ parsedInput }) => {
    await service.deleteFuelEntry(parsedInput.id);
    revalidateFuelPages();
    return { id: parsedInput.id };
  });
