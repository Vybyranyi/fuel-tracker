import "server-only";

import { requireCarScope } from "@/features/cars/services/cars.service";
import type { ServiceRecord } from "@/features/service/domain/service-record";
import * as repository from "@/features/service/repository/service-records.repository";
import {
  withComputedAmounts,
  type SaveServiceRecordInput,
  type UpdateServiceRecordInput,
} from "@/features/service/schemas/service-record.schema";
import { todayInKyiv, type IsoDate } from "@/lib/date";
import { UserFacingError } from "@/lib/safe-action";

/** Скільки останніх записів показуємо в списку. */
export const RECENT_RECORDS_LIMIT = 30;

export interface ServiceFormDefaults {
  /** Сьогодні за Києвом — дата, з якою відкривається форма. */
  performedAt: IsoDate;
}

export function getFormDefaults(): ServiceFormDefaults {
  return { performedAt: todayInKyiv() };
}

export async function getRecentRecords(
  limit: number = RECENT_RECORDS_LIMIT,
): Promise<ServiceRecord[]> {
  return repository.listRecords(await requireCarScope(), limit);
}

export async function getRecord(id: string): Promise<ServiceRecord | null> {
  return repository.findRecord(await requireCarScope(), id);
}

function toRecordToSave(input: SaveServiceRecordInput) {
  return {
    performedAt: input.performedAt,
    odometerKm: input.odometerKm,
    vendor: input.vendor,
    note: input.note,
    // Суми позицій рахуються тут, а не приймаються з форми: інакше в базу
    // можна було б покласти рядок, у якому 2 × 100 дорівнює мільйону.
    items: withComputedAmounts(input),
  };
}

export async function createRecord(
  input: SaveServiceRecordInput,
): Promise<string> {
  return repository.insertRecord(
    await requireCarScope(),
    toRecordToSave(input),
  );
}

export async function updateRecord({
  id,
  ...input
}: UpdateServiceRecordInput): Promise<void> {
  const updated = await repository.updateRecord(
    await requireCarScope(),
    id,
    toRecordToSave(input),
  );

  if (!updated) {
    throw new UserFacingError("Цей запис уже видалено");
  }
}

export async function deleteRecord(id: string): Promise<void> {
  if (!(await repository.deleteRecord(await requireCarScope(), id))) {
    throw new UserFacingError("Цей запис уже видалено");
  }
}
