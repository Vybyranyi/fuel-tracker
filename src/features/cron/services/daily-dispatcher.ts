import "server-only";

import * as repository from "@/features/cron/repository/reminders.repository";
import type { DeliveryReport } from "@/features/notifications/services/push-sender";
import { sendOdometerReminder } from "@/features/notifications/services/notifications.service";
import {
  isLastDayOfMonth,
  monthKeyOf,
  todayInKyiv,
  type IsoDate,
  type MonthKey,
} from "@/lib/date";

export type ReminderOutcome =
  | { status: "sent"; userId: string; delivery: DeliveryReport }
  | { status: "failed"; userId: string; error: string };

export interface DailyReport {
  date: IsoDate;
  month: MonthKey;
  /** `null`, якщо сьогодні не останній день місяця й нагадувати рано. */
  reminders: ReminderOutcome[] | null;
  /** `false`, якщо бодай щось не спрацювало — за цим і видно збій у логах. */
  ok: boolean;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Нагадування про пробіг.
 *
 * Шлемо в останній день місяця й лише тим, у кого є авто без показань за цей
 * місяць. Нагадування про вже зроблене нічого не додає, а привчає змахувати
 * сповіщення не читаючи.
 *
 * Кожен користувач окремо: збій розсилки одному не має ховати решту.
 */
async function runReminders(month: MonthKey): Promise<ReminderOutcome[]> {
  const pending = await repository.listPendingReminders(month);
  const outcomes: ReminderOutcome[] = [];

  for (const { userId, carNames } of pending) {
    try {
      outcomes.push({
        status: "sent",
        userId,
        delivery: await sendOdometerReminder(userId, month, carNames),
      });
    } catch (error) {
      console.error(`Не вдалося нагадати ${userId} про ${month}`, error);
      outcomes.push({ status: "failed", userId, error: messageOf(error) });
    }
  }

  return outcomes;
}

/**
 * Щоденна задача.
 *
 * Крон ходить сюди щодня, бо безкоштовний план Versel не дозволяє частіше
 * разу на добу — і «в останній день місяця» окремим розкладом там не задати.
 * Тому день перевіряється тут, у коді, а не в `vercel.json`.
 *
 * Дія ідемпотентна — а повтори бувають, бо Versel не обіцяє рівно одного
 * запуску: щойно показання за місяць внесли, авто зникає зі списку.
 */
export async function runDailyJobs(
  today: IsoDate = todayInKyiv(),
): Promise<DailyReport> {
  const month = monthKeyOf(today);

  if (!isLastDayOfMonth(today)) {
    return { date: today, month, reminders: null, ok: true };
  }

  const reminders = await runReminders(month);

  return {
    date: today,
    month,
    reminders,
    ok: reminders.every((outcome) => outcome.status !== "failed"),
  };
}
