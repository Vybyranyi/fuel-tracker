import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { loginAttempts } from "@/db/schema";
import {
  INITIAL_THROTTLE_STATE,
  type ThrottleState,
} from "@/features/auth/domain/throttle";

/**
 * Лічильники живуть у БД, а не в памʼяті процесу.
 *
 * Serverless-функції піднімаються й гаснуть на кожен запит: лічильник у
 * памʼяті обнулявся б сам собою, і обмеження темпу перетворилось би на
 * декорацію.
 */
export async function findThrottleState(key: string): Promise<ThrottleState> {
  const [row] = await getDb()
    .select({
      failedCount: loginAttempts.failedCount,
      lockedUntil: loginAttempts.lockedUntil,
    })
    .from(loginAttempts)
    .where(eq(loginAttempts.ipHash, key))
    .limit(1);

  return row ?? INITIAL_THROTTLE_STATE;
}

export async function saveThrottleState(
  key: string,
  state: ThrottleState,
): Promise<void> {
  await getDb()
    .insert(loginAttempts)
    .values({
      ipHash: key,
      failedCount: state.failedCount,
      lockedUntil: state.lockedUntil,
    })
    .onConflictDoUpdate({
      target: loginAttempts.ipHash,
      set: {
        failedCount: state.failedCount,
        lockedUntil: state.lockedUntil,
        updatedAt: new Date(),
      },
    });
}
