import { z } from "zod";

/**
 * Серверні змінні оточення.
 *
 * Схема росте разом із фічами. Тримаємо її в одному місці, щоб і застосунок,
 * і `drizzle.config.ts` перевіряли значення однаково й падали з однаковим
 * зрозумілим повідомленням, а не з `undefined` десь у глибині драйвера.
 */
/**
 * Перевіряємо схему URL, але не хост.
 *
 * Хост навмисно без обмежень: під нього підпадають і `localhost`, і IP —
 * тобто звичайний Postgres, піднятий локально. Правило «має бути домен»
 * відкидало б робочі рядки підключення, нічого не ловлячи натомість.
 * Реальна помилка тут інша — вставити замість рядка підключення API-адресу
 * Supabase, — і її ловить саме протокол.
 */
const postgresUrl = z.url({
  protocol: /^postgres(ql)?$/,
  error: "Очікується рядок підключення до Postgres (postgres://…)",
});

export const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl.describe(
    "Транзакційний пулер Supabase — саме з ним працює застосунок",
  ),

  /**
   * Підключення для міграцій, і тільки для них.
   *
   * Транзакційний пулер роздає одне зʼєднання різним запитам, тож
   * підготовлених запитів у ньому немає, — а drizzle-kit ними користується.
   * Через нього ж міграції падають на `prepared statement already exists`.
   *
   * Необовʼязкова: якщо не задана, `drizzle.config.ts` бере DATABASE_URL.
   * Локально це спрацює, бо там зазвичай пряме підключення.
   */
  DIRECT_URL: postgresUrl.optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Перевіряє оточення при першому зверненні, а не при імпорті модуля:
 * інакше `next build` падав би ще до того, як хоч щось справді полізе в базу.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Неправильні або відсутні змінні оточення:\n${details}\n\n` +
        "Локально їх бере .env.local — див. .env.example.",
    );
  }

  cached = parsed.data;
  return cached;
}
