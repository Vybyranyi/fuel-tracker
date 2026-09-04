import { isAuthApiError } from "@supabase/supabase-js";

/**
 * Чому не вийшло увійти.
 *
 * Розрізняти ці три випадки важливо, бо вони вимагають від людини різного:
 * `rejected` — виправити ввід, `rate-limited` — зачекати, `unreachable` —
 * не робити нічого, бо проблема не на її боці.
 */
export type AuthFailure = "rejected" | "rate-limited" | "unreachable";

/**
 * Розбирає помилку Supabase Auth.
 *
 * Ключове — `unreachable`. Мережевий збій приходить таким самим `error`, як і
 * відмова сервера, і без цієї перевірки застосунок радив би перенабрати
 * правильний код, поки Supabase просто недоступний. Помилка тиха: у логах
 * порожньо, а людина ходить по колу.
 *
 * Ознака саме така: чи це відповідь Supabase (`AuthApiError`), а не збій
 * доставки. `AuthRetryableFetchError` має статус 503, але відповіддю сервера
 * не є — тому статус тут ні до чого, дивимось на тип.
 */
export function classifyAuthFailure(error: unknown): AuthFailure {
  if (!isAuthApiError(error)) return "unreachable";

  return error.status === 429 ? "rate-limited" : "rejected";
}
