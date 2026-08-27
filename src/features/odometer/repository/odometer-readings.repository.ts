import "server-only";

import { asc, desc, eq, gt, lt } from "drizzle-orm";

import { getDb } from "@/db";
import { odometerReadings } from "@/db/schema";
import {
  odometerReadingFromRow,
  type NeighbourReading,
  type OdometerReading,
} from "@/features/odometer/domain/odometer-reading";
import type { IsoDate } from "@/lib/date";

export async function listRecentReadings(
  limit: number,
): Promise<OdometerReading[]> {
  const rows = await getDb()
    .select()
    .from(odometerReadings)
    .orderBy(desc(odometerReadings.recordedAt))
    .limit(limit);

  return rows.map(odometerReadingFromRow);
}

/**
 * Найближчі показання до та після вказаної дати.
 *
 * Потрібні, щоб перевірити нове значення з обох боків: запис можна вносити
 * не лише «в кінець», а й заднім числом між уже наявними.
 */
export async function findNeighbours(recordedAt: IsoDate): Promise<{
  previous: NeighbourReading | null;
  next: NeighbourReading | null;
}> {
  const columns = {
    recordedAt: odometerReadings.recordedAt,
    odometerKm: odometerReadings.odometerKm,
  };

  const [previousRows, nextRows] = await Promise.all([
    getDb()
      .select(columns)
      .from(odometerReadings)
      .where(lt(odometerReadings.recordedAt, recordedAt))
      .orderBy(desc(odometerReadings.recordedAt))
      .limit(1),
    getDb()
      .select(columns)
      .from(odometerReadings)
      .where(gt(odometerReadings.recordedAt, recordedAt))
      .orderBy(asc(odometerReadings.recordedAt))
      .limit(1),
  ]);

  const toNeighbour = (
    row: { recordedAt: string; odometerKm: number } | undefined,
  ): NeighbourReading | null =>
    row
      ? { recordedAt: row.recordedAt as IsoDate, odometerKm: row.odometerKm }
      : null;

  return {
    previous: toNeighbour(previousRows[0]),
    next: toNeighbour(nextRows[0]),
  };
}

/** Останнє за датою показання — воно ж «поточний пробіг». */
export async function findLatestReading(): Promise<OdometerReading | null> {
  const [row] = await getDb()
    .select()
    .from(odometerReadings)
    .orderBy(desc(odometerReadings.recordedAt))
    .limit(1);

  return row ? odometerReadingFromRow(row) : null;
}

/**
 * Записує показання за дату.
 *
 * Саме upsert, а не insert: дата унікальна, і повторний запис за той самий
 * день — це виправлення, а не другий рядок. Інакше різниця пробігу за місяць
 * рахувалася б із двох суперечливих значень.
 */
export async function upsertReading(input: {
  recordedAt: IsoDate;
  odometerKm: number;
  note: string | null;
}): Promise<OdometerReading> {
  const [row] = await getDb()
    .insert(odometerReadings)
    .values(input)
    .onConflictDoUpdate({
      target: odometerReadings.recordedAt,
      set: {
        odometerKm: input.odometerKm,
        note: input.note,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) {
    throw new Error("UPSERT не повернув рядок");
  }

  return odometerReadingFromRow(row);
}

export async function deleteReading(id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(odometerReadings)
    .where(eq(odometerReadings.id, id))
    .returning({ id: odometerReadings.id });

  return rows.length > 0;
}
