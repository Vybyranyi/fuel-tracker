import "server-only";

import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { getServerEnv } from "@/lib/env";

import * as schema from "./schema";

/**
 * Клієнт бази.
 *
 * Драйвер — `neon-http`, а не `neon-serverless`: усі запити застосунку
 * одиничні, а HTTP не платить за встановлення WebSocket-зʼєднання на кожному
 * холодному старті функції. Якщо колись знадобиться атомарність кількох
 * запитів — у neon-http є `db.batch()`; інтерактивні транзакції там недоступні.
 *
 * `server-only` угорі — не косметика: без нього випадковий імпорт із
 * клієнтського компонента затягнув би рядок підключення в браузерний бандл.
 * Тепер це помилка складання, а не витік.
 */
export type Database = NeonHttpDatabase<typeof schema>;

let instance: Database | undefined;

/**
 * Створює клієнт при першому запиті, а не при імпорті модуля.
 *
 * Інакше будь-який файл, що згадує `@/db`, вимагав би DATABASE_URL уже на
 * етапі складання — навіть там, де до бази діло так і не доходить.
 */
export function getDb(): Database {
  instance ??= drizzle(getServerEnv().DATABASE_URL, { schema });
  return instance;
}

export { schema };
