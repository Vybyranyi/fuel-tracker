import "server-only";

import {
  odometerReminder,
  testNotification,
} from "@/features/notifications/domain/reminder";
import * as repository from "@/features/notifications/repository/push-subscriptions.repository";
import {
  sendToAll,
  type DeliveryReport,
} from "@/features/notifications/services/push-sender";
import { isWebPushConfigured } from "@/features/notifications/services/vapid";
import type { SavePushSubscriptionInput } from "@/features/notifications/schemas/push-subscription.schema";
import type { MonthKey } from "@/lib/date";
import { UserFacingError } from "@/lib/safe-action";

export async function subscribe(
  input: SavePushSubscriptionInput,
): Promise<void> {
  await repository.saveSubscription(input);
}

export async function unsubscribe(endpoint: string): Promise<void> {
  await repository.deleteSubscription(endpoint);
}

/** Стан для сторінки налаштувань. */
export interface NotificationsStatus {
  /** Чи заведені ключі VAPID на сервері. */
  configured: boolean;
  /** Скільки пристроїв підписано — їх може бути більше за один. */
  deviceCount: number;
}

export async function getStatus(): Promise<NotificationsStatus> {
  const configured = isWebPushConfigured();

  return {
    configured,
    // Без ключів розсилка все одно не піде, тож і рахувати нема чого.
    deviceCount: configured ? await repository.countSubscriptions() : 0,
  };
}

export async function sendTest(): Promise<DeliveryReport> {
  const report = await sendToAll(testNotification());

  if (report.sent === 0) {
    // Мовчазний «успіх» тут був би найгіршим результатом: людина натиснула
    // кнопку, нічого не прийшло — і незрозуміло, чи то пуш не долетів, чи
    // підписки взагалі немає.
    throw new UserFacingError(
      report.removed > 0
        ? "Підписка вже недійсна. Увімкни сповіщення ще раз."
        : "Немає жодного підписаного пристрою.",
    );
  }

  return report;
}

/** Нагадування про пробіг — його шле щоденний крон в останній день місяця. */
export async function sendOdometerReminder(
  month: MonthKey,
): Promise<DeliveryReport> {
  return sendToAll(odometerReminder(month));
}
