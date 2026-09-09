"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteServiceRecordSchema,
  saveServiceRecordSchema,
  updateServiceRecordSchema,
} from "@/features/service/schemas/service-record.schema";
import * as service from "@/features/service/services/service-records.service";
import { actionClient } from "@/lib/safe-action";

/** Сторінки, які показують ТО. Статистика теж — вона рахує ці суми. */
const AFFECTED_PATHS = ["/costs", "/", "/stats"] as const;

function revalidateServicePages(): void {
  for (const path of AFFECTED_PATHS) {
    revalidatePath(path);
  }
}

export const createServiceRecordAction = actionClient
  .inputSchema(saveServiceRecordSchema)
  .action(async ({ parsedInput }) => {
    await service.createRecord(parsedInput);
    revalidateServicePages();
    redirect("/costs?kind=service");
  });

export const updateServiceRecordAction = actionClient
  .inputSchema(updateServiceRecordSchema)
  .action(async ({ parsedInput }) => {
    await service.updateRecord(parsedInput);
    revalidateServicePages();
    redirect("/costs?kind=service");
  });

export const deleteServiceRecordAction = actionClient
  .inputSchema(deleteServiceRecordSchema)
  .action(async ({ parsedInput }) => {
    await service.deleteRecord(parsedInput.id);
    revalidateServicePages();
    return { id: parsedInput.id };
  });
