import "server-only";

import type { DeliveryReport } from "@/features/notifications/services/push-sender";
import { sendOdometerReminder } from "@/features/notifications/services/notifications.service";
import { getLatestReadingMonth } from "@/features/odometer/services/odometer-readings.service";
import {
  isLastDayOfMonth,
  monthKeyOf,
  todayInKyiv,
  type IsoDate,
  type MonthKey,
} from "@/lib/date";

export type ReminderOutcome =
  | { status: "sent"; month: MonthKey; delivery: DeliveryReport }
  | {
      status: "skipped";
      reason: "not-last-day" | "already-recorded";
      month: MonthKey;
    }
  | { status: "failed"; month: MonthKey; error: string };

export interface DailyReport {
  date: IsoDate;
  reminder: ReminderOutcome;
  /** `false`, якщо бодай щось не спрацювало — за цим і видно збій у логах. */
  ok: boolean;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Нагадування про пробіг.
 *
 * Шлемо в останній день місяця — але тільки якщо показання за цей місяць ще
 * немає. Нагадування про вже зроблене нічого не додає, а привчає змахувати
 * сповіщення не читаючи.
 */
async function runReminder(today: IsoDate): Promise<ReminderOutcome> {
  const month = monthKeyOf(today);

  if (!isLastDayOfMonth(today)) {
    return { status: "skipped", reason: "not-last-day", month };
  }

  try {
    if ((await getLatestReadingMonth()) === month) {
      return { status: "skipped", reason: "already-recorded", month };
    }

    return {
      status: "sent",
      month,
      delivery: await sendOdometerReminder(month),
    };
  } catch (error) {
    console.error(`Не вдалося надіслати нагадування за ${month}`, error);
    return { status: "failed", month, error: messageOf(error) };
  }
}

/**
 * Щоденна задача.
 *
 * Крон ходить сюди щодня, бо безкоштовний план Versel не дозволяє частіше
 * разу на добу — і «в останній день місяця» окремим розкладом там не задати.
 * Тому день перевіряється тут, у коді, а не в `vercel.json`.
 *
 * Дія ідемпотентна — а повтори бувають, бо Versel не обіцяє рівно одного
 * запуску: коли показання за місяць уже є, друге нагадування не піде.
 */
export async function runDailyJobs(
  today: IsoDate = todayInKyiv(),
): Promise<DailyReport> {
  const reminder = await runReminder(today);

  return {
    date: today,
    reminder,
    ok: reminder.status !== "failed",
  };
}
