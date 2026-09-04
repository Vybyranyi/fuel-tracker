/**
 * Адреса проєкту Supabase і публічний ключ.
 *
 * Обидва читаються з `NEXT_PUBLIC_`-змінних, бо потрібні і на сервері, і в
 * браузері. Публічний ключ і має бути публічним: він їде в бандл, а доступ до
 * даних регулюють не він, а політики RLS у самій базі.
 *
 * Не в `serverEnvSchema`: ту схему читає `drizzle.config.ts`, а міграціям до
 * авторизації діла немає. Зате звертання саме до `process.env.NEXT_PUBLIC_…`
 * дослівно тут принципове — Next підставляє значення текстовою заміною, і
 * динамічний доступ до `process.env[name]` у бандлі лишився б `undefined`.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Немає змінної ${name} — див. .env.example`);
  }

  return value;
}

/**
 * Функції, а не константи: інакше перевірка спрацьовувала б на імпорті
 * модуля, і `next build` падав би там, де до Supabase діло навіть не доходить.
 */
export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabasePublishableKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
