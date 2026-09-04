import "server-only";

import { sql } from "drizzle-orm";

import { getClient, type Database } from "./client";
import * as schema from "./schema";

export type { Database };

/** Транзакція з уже виставленою роллю користувача. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Чиї дані читаємо і про яке авто йдеться. */
export interface CarScope {
  userId: string;
  carId: string;
}

/**
 * Виконує запити від імені користувача — так, щоб RLS справді працювала.
 *
 * Драйвер підключається роллю власника таблиць, а власник RLS не помічає.
 * Тому всередині транзакції ми перемикаємось на роль `authenticated` і
 * підкладаємо їй `sub` — саме звідти політики беруть `auth.uid()`.
 *
 * Через це кожен запит застосунку йде в транзакції. Ціна невелика, а виграш
 * той, що забутий `where user_id = …` більше нічого не зливає: база просто не
 * поверне чужий рядок. Це третій рубіж після проксі й `requireUser()` — і
 * єдиний, який працює навіть тоді, коли перші два обійшли помилкою в коді.
 *
 * Порядок усередині принциповий: спершу claims, потім роль. Після
 * перемикання на `authenticated` повернутись назад уже не вийде — прав нема.
 */
export async function withUser<T>(
  userId: string,
  run: (tx: Tx) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });

  return getClient().transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${claims}, true)`,
    );
    await tx.execute(sql`set local role authenticated`);

    return run(tx);
  });
}

/** Те саме, але коли запит стосується конкретного авто. */
export function withCarScope<T>(
  scope: CarScope,
  run: (tx: Tx) => Promise<T>,
): Promise<T> {
  return withUser(scope.userId, run);
}

export { schema };
