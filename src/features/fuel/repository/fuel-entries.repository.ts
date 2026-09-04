import "server-only";

import { and, desc, eq, gte, lte } from "drizzle-orm";

import { withCarScope, type CarScope } from "@/db";
import { fuelEntries } from "@/db/schema";
import {
  fuelEntryFromRow,
  type FuelEntry,
  type FuelEntryAmountsInput,
} from "@/features/fuel/domain/fuel-entry";
import { monthRange, type MonthKey } from "@/lib/date";
import {
  decimal2FromDbString,
  decimal2ToDbString,
  type Decimal2,
} from "@/lib/units";

/** Поля, які пишемо в БД. Службові колонки заповнює сама база. */
function toRow(input: FuelEntryAmountsInput) {
  return {
    filledAt: input.filledAt,
    volumeLiters: decimal2ToDbString(input.volumeLiters),
    pricePerLiter: decimal2ToDbString(input.pricePerLiter),
    totalCost: decimal2ToDbString(input.totalCost),
    note: input.note,
  };
}

/**
 * Останні заправки — для списку на головній.
 *
 * `carId` в умові стоїть навіть попри RLS: політика в базі — це страховка на
 * випадок помилки, а не спосіб фільтрувати. Без явної умови запит просив би
 * усі свої авто одразу, і база чесно б їх віддала.
 */
export async function listRecentEntries(
  scope: CarScope,
  limit: number,
): Promise<FuelEntry[]> {
  const rows = await withCarScope(scope, (tx) =>
    tx
      .select()
      .from(fuelEntries)
      .where(eq(fuelEntries.carId, scope.carId))
      .orderBy(desc(fuelEntries.filledAt), desc(fuelEntries.createdAt))
      .limit(limit),
  );

  return rows.map(fuelEntryFromRow);
}

/** Заправки за місяць — для статистики й місячного вивантаження. */
export async function listEntriesForMonth(
  scope: CarScope,
  month: MonthKey,
): Promise<FuelEntry[]> {
  const { start, end } = monthRange(month);

  const rows = await withCarScope(scope, (tx) =>
    tx
      .select()
      .from(fuelEntries)
      .where(
        and(
          eq(fuelEntries.carId, scope.carId),
          gte(fuelEntries.filledAt, start),
          lte(fuelEntries.filledAt, end),
        ),
      )
      .orderBy(fuelEntries.filledAt),
  );

  return rows.map(fuelEntryFromRow);
}

export async function findEntryById(
  scope: CarScope,
  id: string,
): Promise<FuelEntry | null> {
  const [row] = await withCarScope(scope, (tx) =>
    tx
      .select()
      .from(fuelEntries)
      .where(and(eq(fuelEntries.id, id), eq(fuelEntries.carId, scope.carId)))
      .limit(1),
  );

  return row ? fuelEntryFromRow(row) : null;
}

/**
 * Ціна з останньої заправки — нею наперед заповнюється форма.
 *
 * Береться з БД, а не з localStorage: ціна має підставлятись і на телефоні,
 * і на ноуті, і після чистки браузера. Тягнемо одну колонку, а не весь рядок.
 */
export async function findLatestPricePerLiter(
  scope: CarScope,
): Promise<Decimal2 | null> {
  const [row] = await withCarScope(scope, (tx) =>
    tx
      .select({ pricePerLiter: fuelEntries.pricePerLiter })
      .from(fuelEntries)
      .where(eq(fuelEntries.carId, scope.carId))
      .orderBy(desc(fuelEntries.filledAt), desc(fuelEntries.createdAt))
      .limit(1),
  );

  return row ? decimal2FromDbString(row.pricePerLiter) : null;
}

export async function insertEntry(
  scope: CarScope,
  input: FuelEntryAmountsInput,
): Promise<FuelEntry> {
  const [row] = await withCarScope(scope, (tx) =>
    tx
      .insert(fuelEntries)
      .values({ ...toRow(input), carId: scope.carId })
      .returning(),
  );

  if (!row) {
    throw new Error("INSERT не повернув рядок");
  }

  return fuelEntryFromRow(row);
}

/** Повертає `null`, якщо запису з таким id не існує. */
export async function updateEntry(
  scope: CarScope,
  id: string,
  input: FuelEntryAmountsInput,
): Promise<FuelEntry | null> {
  const [row] = await withCarScope(scope, (tx) =>
    tx
      .update(fuelEntries)
      .set(toRow(input))
      .where(and(eq(fuelEntries.id, id), eq(fuelEntries.carId, scope.carId)))
      .returning(),
  );

  return row ? fuelEntryFromRow(row) : null;
}

/** Повертає `false`, якщо видаляти було нічого. */
export async function deleteEntry(
  scope: CarScope,
  id: string,
): Promise<boolean> {
  const rows = await withCarScope(scope, (tx) =>
    tx
      .delete(fuelEntries)
      .where(and(eq(fuelEntries.id, id), eq(fuelEntries.carId, scope.carId)))
      .returning({ id: fuelEntries.id }),
  );

  return rows.length > 0;
}
