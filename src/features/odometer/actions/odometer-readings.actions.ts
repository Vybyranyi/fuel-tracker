"use server";

import { revalidatePath } from "next/cache";

import {
  deleteOdometerReadingSchema,
  saveOdometerReadingSchema,
} from "@/features/odometer/schemas/odometer-reading.schema";
import * as service from "@/features/odometer/services/odometer-readings.service";
import { actionClient } from "@/lib/safe-action";

const AFFECTED_PATHS = ["/odometer", "/stats"] as const;

function revalidateOdometerPages(): void {
  for (const path of AFFECTED_PATHS) {
    revalidatePath(path);
  }
}

export const saveOdometerReadingAction = actionClient
  .inputSchema(saveOdometerReadingSchema)
  .action(async ({ parsedInput }) => {
    const result = await service.saveReading(parsedInput);

    // Кеш скидаємо лише коли запис справді змінився: на «перепитай» дані
    // в базі ті самі.
    if (result.status === "saved") revalidateOdometerPages();

    return result.status === "saved"
      ? { status: "saved" as const }
      : { status: "needs-confirmation" as const, warning: result.warning };
  });

export const deleteOdometerReadingAction = actionClient
  .inputSchema(deleteOdometerReadingSchema)
  .action(async ({ parsedInput }) => {
    await service.deleteReading(parsedInput.id);
    revalidateOdometerPages();
    return { id: parsedInput.id };
  });
