import "server-only";

import { and, asc, desc, eq, gt, lt } from "drizzle-orm";

import { withCarScope, type CarScope } from "@/db";
import { odometerReadings } from "@/db/schema";
import {
  odometerReadingFromRow,
  type NeighbourReading,
  type OdometerReading,
} from "@/features/odometer/domain/odometer-reading";
import type { IsoDate } from "@/lib/date";

export async function listRecentReadings(
  scope: CarScope,
  limit: number,
): Promise<OdometerReading[]> {
  const rows = await withCarScope(scope, (tx) =>
    tx
      .select()
      .from(odometerReadings)
      .where(eq(odometerReadings.carId, scope.carId))
      .orderBy(desc(odometerReadings.recordedAt))
      .limit(limit),
  );

  return rows.map(odometerReadingFromRow);
}

/**
 * Найближчі показання до та після вказаної дати.
 *
 * Потрібні, щоб перевірити нове значення з обох боків: запис можна вносити
 * не лише «в кінець», а й заднім числом між уже наявними.
 */
export async function findNeighbours(
  scope: CarScope,
  recordedAt: IsoDate,
): Promise<{
  previous: NeighbourReading | null;
  next: NeighbourReading | null;
}> {
  const columns = {
    recordedAt: odometerReadings.recordedAt,
    odometerKm: odometerReadings.odometerKm,
  };

  const ofCar = eq(odometerReadings.carId, scope.carId);

  // Обидва запити в одній транзакції: два окремі `withCarScope` означали б
  // два підключення й дві виставлені ролі там, де вистачає однієї.
  const [previousRows, nextRows] = await withCarScope(scope, (tx) =>
    Promise.all([
      tx
        .select(columns)
        .from(odometerReadings)
        .where(and(ofCar, lt(odometerReadings.recordedAt, recordedAt)))
        .orderBy(desc(odometerReadings.recordedAt))
        .limit(1),
      tx
        .select(columns)
        .from(odometerReadings)
        .where(and(ofCar, gt(odometerReadings.recordedAt, recordedAt)))
        .orderBy(asc(odometerReadings.recordedAt))
        .limit(1),
    ]),
  );

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
export async function findLatestReading(
  scope: CarScope,
): Promise<OdometerReading | null> {
  const [row] = await withCarScope(scope, (tx) =>
    tx
      .select()
      .from(odometerReadings)
      .where(eq(odometerReadings.carId, scope.carId))
      .orderBy(desc(odometerReadings.recordedAt))
      .limit(1),
  );

  return row ? odometerReadingFromRow(row) : null;
}

/**
 * Записує показання за дату.
 *
 * Саме upsert, а не insert: дата унікальна, і повторний запис за той самий
 * день — це виправлення, а не другий рядок. Інакше різниця пробігу за місяць
 * рахувалася б із двох суперечливих значень.
 */
export async function upsertReading(
  scope: CarScope,
  input: {
    recordedAt: IsoDate;
    odometerKm: number;
    note: string | null;
  },
): Promise<OdometerReading> {
  const [row] = await withCarScope(scope, (tx) =>
    tx
      .insert(odometerReadings)
      .values({ ...input, carId: scope.carId })
      .onConflictDoUpdate({
        // Ціль конфлікту — пара «авто + дата»: та сама дата в іншому авто це
        // окремий запис, а не той самий, який треба виправити.
        target: [odometerReadings.carId, odometerReadings.recordedAt],
        set: {
          odometerKm: input.odometerKm,
          note: input.note,
          updatedAt: new Date(),
        },
      })
      .returning(),
  );

  if (!row) {
    throw new Error("UPSERT не повернув рядок");
  }

  return odometerReadingFromRow(row);
}

export async function deleteReading(
  scope: CarScope,
  id: string,
): Promise<boolean> {
  const rows = await withCarScope(scope, (tx) =>
    tx
      .delete(odometerReadings)
      .where(
        and(
          eq(odometerReadings.id, id),
          eq(odometerReadings.carId, scope.carId),
        ),
      )
      .returning({ id: odometerReadings.id }),
  );

  return rows.length > 0;
}
