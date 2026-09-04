import "server-only";

import { requireUser } from "@/features/auth/services/session";
import {
  odometerReminder,
  testNotification,
} from "@/features/notifications/domain/reminder";
import * as repository from "@/features/notifications/repository/push-subscriptions.repository";
import {
  sendToUser,
  type DeliveryReport,
} from "@/features/notifications/services/push-sender";
import { isWebPushConfigured } from "@/features/notifications/services/vapid";
import type { SavePushSubscriptionInput } from "@/features/notifications/schemas/push-subscription.schema";
import type { MonthKey } from "@/lib/date";
import { UserFacingError } from "@/lib/safe-action";

export async function subscribe(
  input: SavePushSubscriptionInput,
): Promise<void> {
  const user = await requireUser();
  await repository.saveSubscription(user.id, input);
}

export async function unsubscribe(endpoint: string): Promise<void> {
  const user = await requireUser();
  await repository.deleteSubscription(user.id, endpoint);
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

  if (!configured) {
    // Без ключів розсилка все одно не піде, тож і рахувати нема чого.
    return { configured, deviceCount: 0 };
  }

  const user = await requireUser();

  return {
    configured,
    deviceCount: await repository.countSubscriptions(user.id),
  };
}

export async function sendTest(): Promise<DeliveryReport> {
  const user = await requireUser();
  const report = await sendToUser(user.id, testNotification());

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

/**
 * Нагадування про пробіг — його шле щоденний крон в останній день місяця.
 *
 * Користувач приходить аргументом, а не з сесії: крон працює без неї.
 */
export async function sendOdometerReminder(
  userId: string,
  month: MonthKey,
  carNames: readonly string[],
): Promise<DeliveryReport> {
  return sendToUser(userId, odometerReminder(month, carNames));
}
