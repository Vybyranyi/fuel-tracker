import "server-only";

import type { DeliveryReport } from "@/features/notifications/services/push-sender";
import { sendOdometerReminder } from "@/features/notifications/services/notifications.service";
import { getLatestReadingMonth } from "@/features/odometer/services/odometer-readings.service";
import {
  exportPeriod,
  getExportStatus,
} from "@/features/sheets-export/services/sheets-export.service";
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

export type ExportOutcome =
  | { status: "exported" | "already-exported" | "no-data"; period: MonthKey }
  | { status: "failed"; period: MonthKey; error: string };

export interface DailyReport {
  date: IsoDate;
  reminder: ReminderOutcome;
  exports: ExportOutcome[];
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
 * Вивантаження закритих місяців.
 *
 * Свідомо не «першого числа вивантажуємо попередній місяць», а «щодня
 * вивантажуємо все, що вже закрито й ще не в таблиці». Різниця в тому, що
 * буде, якщо крон одного дня не спрацює: за датою місяць було б втрачено
 * назавжди, бо першого числа він більше не настане. За станом — наступний
 * запуск просто добере його.
 *
 * Кожен місяць окремо: збій на одному не має ховати решту.
 */
async function runExports(): Promise<ExportOutcome[]> {
  const { configured, pending } = await getExportStatus();

  if (!configured || pending.length === 0) return [];

  const outcomes: ExportOutcome[] = [];

  for (const period of pending) {
    try {
      const result = await exportPeriod(period);
      outcomes.push({ status: result.status, period });
    } catch (error) {
      console.error(`Не вдалося вивантажити ${period}`, error);
      outcomes.push({ status: "failed", period, error: messageOf(error) });
    }
  }

  return outcomes;
}

/**
 * Щоденний диспетчер.
 *
 * Один крон замість двох місячних: безкоштовний план Versel дозволяє запуск
 * не частіше разу на добу, тож «першого числа» і «в останній день місяця»
 * окремими розкладами там не задати. Диспетчер щодня сам вирішує, що робити.
 *
 * Обидві дії безпечні при повторному виклику — а він буває, бо Versel не
 * обіцяє рівно одного запуску.
 */
export async function runDailyJobs(
  today: IsoDate = todayInKyiv(),
): Promise<DailyReport> {
  // Послідовно, а не паралельно: якщо сьогодні й останній день місяця, і є що
  // вивантажити, дві важкі операції одночасно на найменшому інстансі Neon
  // упруться одна в одну без жодної потреби — крон нікуди не поспішає.
  const reminder = await runReminder(today);
  const exports = await runExports();

  return {
    date: today,
    reminder,
    exports,
    ok:
      reminder.status !== "failed" &&
      exports.every((outcome) => outcome.status !== "failed"),
  };
}
