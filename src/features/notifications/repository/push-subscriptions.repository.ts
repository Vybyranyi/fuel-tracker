import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { withUser } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import type { SavePushSubscriptionInput } from "@/features/notifications/schemas/push-subscription.schema";

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Зберігає підписку, оновлюючи наявну з тим самим `endpoint`.
 *
 * Браузер видає той самий endpoint, поки підписку не відкликали, тож повторна
 * підписка з того ж пристрою має оновити ключі, а не додати другий рядок.
 * Лічильник помилок при цьому скидається: підписка щойно підтверджена живою.
 */
export async function saveSubscription(
  userId: string,
  input: SavePushSubscriptionInput,
): Promise<void> {
  await withUser(userId, (tx) =>
    tx
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent ?? null,
          failureCount: 0,
          updatedAt: new Date(),
        },
      }),
  );
}

export async function deleteSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  await withUser(userId, (tx) =>
    tx
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, userId),
        ),
      ),
  );
}

/**
 * Підписки одного користувача.
 *
 * Кличеться і зі сторінки налаштувань, і з крону: крон знає, кому шле, тож
 * ходить сюди тим самим шляхом, а не в обхід RLS.
 */
export async function listSubscriptions(
  userId: string,
): Promise<StoredSubscription[]> {
  return withUser(userId, (tx) =>
    tx
      .select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId)),
  );
}

export async function countSubscriptions(userId: string): Promise<number> {
  const [row] = await withUser(userId, (tx) =>
    tx
      .select({ count: sql<number>`count(*)::int` })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId)),
  );

  return row?.count ?? 0;
}

/** Успішна доставка: підписка жива, попередні збої більше не рахуються. */
export async function markDelivered(
  userId: string,
  endpoint: string,
): Promise<void> {
  await withUser(userId, (tx) =>
    tx
      .update(pushSubscriptions)
      .set({ failureCount: 0, lastSuccessAt: new Date() })
      .where(eq(pushSubscriptions.endpoint, endpoint)),
  );
}

/**
 * Збій, після якого підписку ще рано викидати.
 *
 * Push-сервіс буває недоступним хвилинами, і видаляти підписку через одну
 * помилку означало б мовчки відписати пристрій від нагадувань.
 */
export async function markFailed(
  userId: string,
  endpoint: string,
): Promise<void> {
  await withUser(userId, (tx) =>
    tx
      .update(pushSubscriptions)
      .set({ failureCount: sql`${pushSubscriptions.failureCount} + 1` })
      .where(eq(pushSubscriptions.endpoint, endpoint)),
  );
}
