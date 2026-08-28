import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
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
  input: SavePushSubscriptionInput,
): Promise<void> {
  await getDb()
    .insert(pushSubscriptions)
    .values({
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
        failureCount: 0,
        updatedAt: new Date(),
      },
    });
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await getDb()
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function listSubscriptions(): Promise<StoredSubscription[]> {
  return getDb()
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions);
}

export async function countSubscriptions(): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(pushSubscriptions);

  return row?.count ?? 0;
}

/** Успішна доставка: підписка жива, попередні збої більше не рахуються. */
export async function markDelivered(endpoint: string): Promise<void> {
  await getDb()
    .update(pushSubscriptions)
    .set({ failureCount: 0, lastSuccessAt: new Date() })
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/**
 * Збій, після якого підписку ще рано викидати.
 *
 * Push-сервіс буває недоступним хвилинами, і видаляти підписку через одну
 * помилку означало б мовчки відписати пристрій від нагадувань.
 */
export async function markFailed(endpoint: string): Promise<void> {
  await getDb()
    .update(pushSubscriptions)
    .set({ failureCount: sql`${pushSubscriptions.failureCount} + 1` })
    .where(eq(pushSubscriptions.endpoint, endpoint));
}
