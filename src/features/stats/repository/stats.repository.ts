import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { withCarScope, type CarScope } from "@/db";
import { fuelEntries, odometerReadings } from "@/db/schema";
import type {
  MonthlyAggregateRow,
  OdometerPoint,
} from "@/features/stats/domain/monthly-stats";
import type { IsoDate } from "@/lib/date";

/**
 * Помісячні суми — агрегатом у SQL, а не в застосунку.
 *
 * Тягнути всі заправки, щоб додати їх у памʼяті, означало б з роками возити
 * через мережу дедалі більший масив заради півдюжини чисел.
 */
export async function aggregateFuelByMonth(
  scope: CarScope,
): Promise<MonthlyAggregateRow[]> {
  const period = sql<string>`to_char(${fuelEntries.filledAt}, 'YYYY-MM')`;

  return withCarScope(scope, (tx) =>
    tx
      .select({
        period,
        liters: sql<string>`sum(${fuelEntries.volumeLiters})`,
        totalCost: sql<string>`sum(${fuelEntries.totalCost})`,
        fillCount: sql<number>`count(*)::int`,
      })
      .from(fuelEntries)
      .where(eq(fuelEntries.carId, scope.carId))
      .groupBy(period)
      .orderBy(asc(period)),
  );
}

/**
 * Усі показання одометра.
 *
 * Тут агрегат у SQL не допоміг би: пробіг за місяць — це різниця між сусідніми
 * записами, і рахувати її віконною функцією було б важче для читання, ніж
 * чистою функцією в домені, яку видно з тестів.
 */
export async function listOdometerPoints(
  scope: CarScope,
): Promise<OdometerPoint[]> {
  const rows = await withCarScope(scope, (tx) =>
    tx
      .select({
        recordedAt: odometerReadings.recordedAt,
        odometerKm: odometerReadings.odometerKm,
      })
      .from(odometerReadings)
      .where(eq(odometerReadings.carId, scope.carId))
      .orderBy(asc(odometerReadings.recordedAt)),
  );

  return rows.map((row) => ({
    recordedAt: row.recordedAt as IsoDate,
    odometerKm: row.odometerKm,
  }));
}
