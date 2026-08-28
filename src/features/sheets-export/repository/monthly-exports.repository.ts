import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { monthlyExports } from "@/db/schema";
import type { SheetRow } from "@/features/sheets-export/domain/export-row";
import { monthKey, type MonthKey } from "@/lib/date";

/**
 * Займає місяць під вивантаження.
 *
 * Повертає `false`, якщо його вже зайняли раніше. Саме тут і живе
 * ідемпотентність: Versel не гарантує рівно одного запуску крону, а два
 * одночасні дописали б у таблицю два однакові рядки. Перевірка «чи є запис»
 * окремим запитом від цього не рятує — між нею і вставкою є проміжок, у який
 * встигає пролізти другий виклик. Унікальний індекс на `period` — рятує.
 *
 * Знімок рядка кладемо одразу: він відомий ще до звернення до Google, і якщо
 * колись цифри в таблиці розійдуться з базою, буде видно, що саме ми слали.
 */
export async function claimPeriod(
  period: MonthKey,
  row: SheetRow,
): Promise<boolean> {
  const claimed = await getDb()
    .insert(monthlyExports)
    .values({ period, rowSnapshot: row })
    .onConflictDoNothing({ target: monthlyExports.period })
    .returning({ id: monthlyExports.id });

  return claimed.length > 0;
}

/**
 * Звільняє місяць, коли записати в таблицю не вдалося.
 *
 * Без цього невдала спроба заблокувала б місяць назавжди: крон більше не
 * повернувся б до нього, і рядка в таблиці не з'явилося б ніколи.
 */
export async function releasePeriod(period: MonthKey): Promise<void> {
  await getDb().delete(monthlyExports).where(eq(monthlyExports.period, period));
}

export async function listExportedPeriods(): Promise<MonthKey[]> {
  const rows = await getDb()
    .select({ period: monthlyExports.period })
    .from(monthlyExports);

  return rows.map((row) => monthKey(row.period));
}
