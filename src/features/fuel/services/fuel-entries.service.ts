import "server-only";

import { requireCarScope } from "@/features/cars/services/cars.service";
import type { FuelEntry } from "@/features/fuel/domain/fuel-entry";
import * as repository from "@/features/fuel/repository/fuel-entries.repository";
import type {
  CreateFuelEntryInput,
  UpdateFuelEntryInput,
} from "@/features/fuel/schemas/fuel-entry.schema";
import { todayInKyiv, type IsoDate } from "@/lib/date";
import { UserFacingError } from "@/lib/safe-action";
import type { Decimal2 } from "@/lib/units";

/** Скільки останніх заправок показуємо під формою. */
export const RECENT_ENTRIES_LIMIT = 10;

export interface FuelEntryFormDefaults {
  /** Сьогодні за Києвом — дата, з якою відкривається форма. */
  filledAt: IsoDate;
  /** Ціна з попередньої заправки або `null`, якщо заправок ще не було. */
  pricePerLiter: Decimal2 | null;
}

/**
 * Те, чим форма заповнюється при відкритті.
 *
 * Обидва значення читаються на сервері й приходять у форму вже готовими —
 * тому поле ціни не блимає порожнім і не потребує запиту з браузера.
 */
export async function getFormDefaults(): Promise<FuelEntryFormDefaults> {
  const scope = await requireCarScope();
  const pricePerLiter = await repository.findLatestPricePerLiter(scope);

  return {
    filledAt: todayInKyiv(),
    pricePerLiter,
  };
}

export async function getRecentEntries(
  limit: number = RECENT_ENTRIES_LIMIT,
): Promise<FuelEntry[]> {
  return repository.listRecentEntries(await requireCarScope(), limit);
}

export async function createFuelEntry(
  input: CreateFuelEntryInput,
): Promise<FuelEntry> {
  return repository.insertEntry(await requireCarScope(), input);
}

/**
 * Оновлює заправку.
 *
 * Відсутній запис — не збій, а звичайна ситуація: вкладку могли тримати
 * відкритою, поки запис видалили з телефона. Тому виняток із текстом для
 * людини, а не падіння з нейтральним «щось пішло не так».
 */
export async function updateFuelEntry({
  id,
  ...amounts
}: UpdateFuelEntryInput): Promise<FuelEntry> {
  const updated = await repository.updateEntry(
    await requireCarScope(),
    id,
    amounts,
  );

  if (!updated) {
    throw new UserFacingError("Цю заправку вже видалено");
  }

  return updated;
}

export async function deleteFuelEntry(id: string): Promise<void> {
  const deleted = await repository.deleteEntry(await requireCarScope(), id);

  if (!deleted) {
    throw new UserFacingError("Цю заправку вже видалено");
  }
}
