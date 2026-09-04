import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/lib/env";

import * as schema from "./schema";

/**
 * Клієнт бази.
 *
 * Драйвер — `postgres-js` поверх звичайного протоколу Postgres, а не HTTP.
 * HTTP-драйвер Neon дешевший на холодному старті, але вміє лише одиничні
 * запити: інтерактивних транзакцій у ньому немає. Далі вони знадобляться —
 * ізоляція даних будується на транзакції, у якій виставляється роль
 * користувача, — тож вибір драйвера тут задає саме це, а не смак.
 *
 * `server-only` угорі — не косметика: без нього випадковий імпорт із
 * клієнтського компонента затягнув би рядок підключення в браузерний бандл.
 * Тепер це помилка складання, а не витік.
 */
export type Database = PostgresJsDatabase<typeof schema>;

let instance: Database | undefined;

/**
 * Створює клієнт при першому запиті, а не при імпорті модуля.
 *
 * Інакше будь-який файл, що згадує `@/db`, вимагав би DATABASE_URL уже на
 * етапі складання — навіть там, де до бази діло так і не доходить.
 */
export function getDb(): Database {
  if (!instance) {
    const client = postgres(getServerEnv().DATABASE_URL, {
      // Транзакційний пулер Supabase (порт 6543) роздає одне й те саме
      // зʼєднання різним запитам, тож підготовлених запитів там не існує:
      // з `prepare: true` драйвер посилався б на те, чого на сервері вже нема.
      prepare: false,
      // Один інстанс функції обробляє один запит за раз, тож більший пул тут
      // не прискорює нічого — лише тримає зайві зʼєднання до пулера.
      max: 1,
    });

    instance = drizzle(client, { schema });
  }

  return instance;
}

export { schema };
