import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { serverEnvSchema } from "./src/lib/env";

// drizzle-kit — звичайний CLI поза Next, тож .env.local сам він не підхопить.
config({ path: ".env.local" });

/** Команди drizzle-kit, які справді ходять у базу. */
const COMMANDS_NEEDING_CONNECTION = ["migrate", "push", "pull", "studio", "up"];

/**
 * `generate` будує SQL лише зі схеми — підключення йому не потрібне, і
 * вимагати DATABASE_URL для нього означало б не могти згенерувати міграцію
 * без доступу до прод-бази (наприклад, на CI).
 *
 * Береться DIRECT_URL, а не DATABASE_URL: drizzle-kit користується
 * підготовленими запитами, яких у транзакційному пулері Supabase не існує.
 */
function resolveDatabaseUrl(): string {
  const needsConnection = process.argv.some((arg) =>
    COMMANDS_NEEDING_CONNECTION.includes(arg),
  );

  const parsed = serverEnvSchema.safeParse(process.env);

  if (parsed.success) return parsed.data.DIRECT_URL ?? parsed.data.DATABASE_URL;
  if (!needsConnection) return "";

  throw new Error(
    "Для цієї команди потрібен DATABASE_URL (а краще DIRECT_URL). Поклади його в .env.local — див. .env.example.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: resolveDatabaseUrl() },
  // Міграції зберігаємо у файлах і застосовуємо явно (`db:migrate`).
  // `push` навмисно не виведено в скрипти: він змінює схему без сліду
  // в історії, а нам потрібна відтворюваність.
  strict: true,
  verbose: true,
});
