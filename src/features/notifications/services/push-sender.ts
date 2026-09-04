import "server-only";

import webpush, { WebPushError } from "web-push";

import type { NotificationPayload } from "@/features/notifications/domain/reminder";
import * as repository from "@/features/notifications/repository/push-subscriptions.repository";
import { configureWebPush } from "@/features/notifications/services/vapid";

/**
 * Підсумок розсилки. Повертається і кнопці «перевірити», і крону — саме він
 * лягає в логи Versel, коли нагадування не дійшло.
 */
export interface DeliveryReport {
  sent: number;
  /** Скільки підписок видалено як мертві. */
  removed: number;
  failed: number;
}

/**
 * Коди, після яких підписку немає сенсу тримати.
 *
 * 404 і 410 від push-сервісу означають, що підписки більше не існує: браузер
 * її відкликав або застосунок видалили з головного екрана. Це остаточно, на
 * відміну від 429 чи 500, після яких варто спробувати наступного разу.
 */
const GONE_STATUS_CODES = new Set([404, 410]);

/**
 * Розсилає на всі пристрої одного користувача.
 *
 * Саме одного: підписки лежать під RLS, і «всім одразу» вже не існує як
 * запиту. Крон, якому треба обійти багатьох, викликає це в циклі — і кожен
 * виклик ходить у базу від імені того, кому шле.
 */
export async function sendToUser(
  userId: string,
  payload: NotificationPayload,
): Promise<DeliveryReport> {
  const subscriptions = await repository.listSubscriptions(userId);

  if (subscriptions.length === 0) {
    return { sent: 0, removed: 0, failed: 0 };
  }

  configureWebPush();
  const body = JSON.stringify(payload);

  // Паралельно й через `allSettled`: один мертвий пристрій не має заважати
  // доставці на решту, а `all` обірвав би розсилку на першій же помилці.
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
        await repository.markDelivered(userId, subscription.endpoint);
        return "sent" as const;
      } catch (error) {
        if (
          error instanceof WebPushError &&
          GONE_STATUS_CODES.has(error.statusCode)
        ) {
          await repository.deleteSubscription(userId, subscription.endpoint);
          return "removed" as const;
        }

        await repository.markFailed(userId, subscription.endpoint);
        // У логи — з адресою, бо підписок може бути кілька, і без неї не
        // видно, який саме пристрій відвалився.
        console.error(
          `Не вдалося надіслати пуш на ${subscription.endpoint}`,
          error,
        );
        return "failed" as const;
      }
    }),
  );

  const report: DeliveryReport = { sent: 0, removed: 0, failed: 0 };

  for (const result of results) {
    // `rejected` тут може дати лише збій самої бази у відмітці результату —
    // сама відправка загорнута в try. Рахуємо як невдачу, щоб не збрехати.
    if (result.status === "rejected") {
      console.error("Збій при оновленні стану підписки", result.reason);
      report.failed += 1;
      continue;
    }

    report[result.value] += 1;
  }

  return report;
}
