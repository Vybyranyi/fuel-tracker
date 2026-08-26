import "server-only";

import { and, desc, eq, gte, lte } from "drizzle-orm";

import { getDb } from "@/db";
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

/** Останні заправки — для списку на головній. */
export async function listRecentEntries(limit: number): Promise<FuelEntry[]> {
  const rows = await getDb()
    .select()
    .from(fuelEntries)
    .orderBy(desc(fuelEntries.filledAt), desc(fuelEntries.createdAt))
    .limit(limit);

  return rows.map(fuelEntryFromRow);
}

/** Заправки за місяць — для статистики й місячного вивантаження. */
export async function listEntriesForMonth(
  month: MonthKey,
): Promise<FuelEntry[]> {
  const { start, end } = monthRange(month);

  const rows = await getDb()
    .select()
    .from(fuelEntries)
    .where(
      and(gte(fuelEntries.filledAt, start), lte(fuelEntries.filledAt, end)),
    )
    .orderBy(fuelEntries.filledAt);

  return rows.map(fuelEntryFromRow);
}

export async function findEntryById(id: string): Promise<FuelEntry | null> {
  const [row] = await getDb()
    .select()
    .from(fuelEntries)
    .where(eq(fuelEntries.id, id))
    .limit(1);

  return row ? fuelEntryFromRow(row) : null;
}

/**
 * Ціна з останньої заправки — нею наперед заповнюється форма.
 *
 * Береться з БД, а не з localStorage: ціна має підставлятись і на телефоні,
 * і на ноуті, і після чистки браузера. Тягнемо одну колонку, а не весь рядок.
 */
export async function findLatestPricePerLiter(): Promise<Decimal2 | null> {
  const [row] = await getDb()
    .select({ pricePerLiter: fuelEntries.pricePerLiter })
    .from(fuelEntries)
    .orderBy(desc(fuelEntries.filledAt), desc(fuelEntries.createdAt))
    .limit(1);

  return row ? decimal2FromDbString(row.pricePerLiter) : null;
}

export async function insertEntry(
  input: FuelEntryAmountsInput,
): Promise<FuelEntry> {
  const [row] = await getDb()
    .insert(fuelEntries)
    .values(toRow(input))
    .returning();

  if (!row) {
    throw new Error("INSERT не повернув рядок");
  }

  return fuelEntryFromRow(row);
}

/** Повертає `null`, якщо запису з таким id не існує. */
export async function updateEntry(
  id: string,
  input: FuelEntryAmountsInput,
): Promise<FuelEntry | null> {
  const [row] = await getDb()
    .update(fuelEntries)
    .set(toRow(input))
    .where(eq(fuelEntries.id, id))
    .returning();

  return row ? fuelEntryFromRow(row) : null;
}

/** Повертає `false`, якщо видаляти було нічого. */
export async function deleteEntry(id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(fuelEntries)
    .where(eq(fuelEntries.id, id))
    .returning({ id: fuelEntries.id });

  return rows.length > 0;
}
