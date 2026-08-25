import { z } from "zod";

/**
 * Серверні змінні оточення.
 *
 * Схема росте разом із фічами. Тримаємо її в одному місці, щоб і застосунок,
 * і `drizzle.config.ts` перевіряли значення однаково й падали з однаковим
 * зрозумілим повідомленням, а не з `undefined` десь у глибині драйвера.
 */
export const serverEnvSchema = z.object({
  DATABASE_URL: z
    .url({
      protocol: /^postgres(ql)?$/,
      hostname: z.regexes.domain,
      error: "Очікується рядок підключення до Postgres (postgres://…)",
    })
    .describe("Рядок підключення до Neon Postgres"),
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
