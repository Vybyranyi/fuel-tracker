import "server-only";

import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import { getAdminDb } from "@/db/admin";
import { cars, odometerReadings } from "@/db/schema";
import { monthRange, type MonthKey } from "@/lib/date";

export interface PendingReminder {
  userId: string;
  /** Авто, за які показань за цей місяць ще немає. */
  carNames: string[];
}

/**
 * Кому й про які авто нагадати.
 *
 * Єдине місце в застосунку, що читає повз RLS, — і інакше не вийде: запит за
 * визначенням охоплює всіх користувачів, а користувача, від імені якого його
 * зробити, у крону немає.
 *
 * Одним запитом, а не «список користувачів, потім по авто на кожного»: другий
 * варіант ходив би в базу стільки разів, скільки в застосунку людей.
 */
export async function listPendingReminders(
  month: MonthKey,
): Promise<PendingReminder[]> {
  const { start, end } = monthRange(month);

  const rows = await getAdminDb()
    .select({ userId: cars.userId, carName: cars.name })
    .from(cars)
    .where(
      // «Немає показань за цей місяць» саме як NOT EXISTS: LEFT JOIN дав би
      // рядок на кожне показання, і авто з трьома записами прийшло б тричі.
      sql`not exists (
        select 1 from ${odometerReadings}
        where ${and(
          eq(odometerReadings.carId, cars.id),
          gte(odometerReadings.recordedAt, start),
          lte(odometerReadings.recordedAt, end),
        )}
      )`,
    )
    .orderBy(asc(cars.userId), asc(cars.createdAt));

  const byUser = new Map<string, string[]>();

  for (const { userId, carName } of rows) {
    const names = byUser.get(userId);
    if (names) {
      names.push(carName);
    } else {
      byUser.set(userId, [carName]);
    }
  }

  return [...byUser].map(([userId, carNames]) => ({ userId, carNames }));
}
