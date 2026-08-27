import "server-only";

import {
  describeOdometerAnomaly,
  type OdometerReading,
} from "@/features/odometer/domain/odometer-reading";
import * as repository from "@/features/odometer/repository/odometer-readings.repository";
import type { SaveOdometerReadingInput } from "@/features/odometer/schemas/odometer-reading.schema";
import { todayInKyiv, type IsoDate } from "@/lib/date";
import { UserFacingError } from "@/lib/safe-action";

/** Скільки останніх показань показуємо під формою. */
export const RECENT_READINGS_LIMIT = 12;

export interface OdometerFormDefaults {
  /** Сьогодні за Києвом. */
  recordedAt: IsoDate;
  /** Останнє відоме показання — щоб було видно, від чого відштовхуватись. */
  latest: OdometerReading | null;
}

export async function getFormDefaults(): Promise<OdometerFormDefaults> {
  const latest = await repository.findLatestReading();
  return { recordedAt: todayInKyiv(), latest };
}

export function getRecentReadings(
  limit: number = RECENT_READINGS_LIMIT,
): Promise<OdometerReading[]> {
  return repository.listRecentReadings(limit);
}

/**
 * Результат збереження.
 *
 * Підозріле показання — не помилка, а привід перепитати: одометр міг бути
 * заміненим, а помилковий запис треба мати змогу виправити вниз. Тому це
 * значення, що повертається, а не виняток: інакше клієнт не відрізнив би
 * «перепитай» від «зламалось».
 */
export type SaveOdometerResult =
  | { status: "saved"; reading: OdometerReading }
  | { status: "needs-confirmation"; warning: string };

export async function saveReading(
  input: SaveOdometerReadingInput,
): Promise<SaveOdometerResult> {
  if (!input.confirmed) {
    const neighbours = await repository.findNeighbours(input.recordedAt);
    const warning = describeOdometerAnomaly(
      input.odometerKm,
      input.recordedAt,
      neighbours,
    );

    if (warning) {
      return { status: "needs-confirmation", warning };
    }
  }

  const reading = await repository.upsertReading({
    recordedAt: input.recordedAt,
    odometerKm: input.odometerKm,
    note: input.note,
  });

  return { status: "saved", reading };
}

export async function deleteReading(id: string): Promise<void> {
  const deleted = await repository.deleteReading(id);

  if (!deleted) {
    throw new UserFacingError("Це показання вже видалено");
  }
}
