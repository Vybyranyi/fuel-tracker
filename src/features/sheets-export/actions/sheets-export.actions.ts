"use server";

import { revalidatePath } from "next/cache";

import { exportMonthSchema } from "@/features/sheets-export/schemas/export-month.schema";
import * as service from "@/features/sheets-export/services/sheets-export.service";
import { actionClient } from "@/lib/safe-action";

export const exportMonthAction = actionClient
  .inputSchema(exportMonthSchema)
  .action(async ({ parsedInput }) => {
    const result = await service.exportPeriod(parsedInput.period);
    // Вивантажений місяць має зникнути зі списку без перезавантаження.
    revalidatePath("/settings");
    return result;
  });
