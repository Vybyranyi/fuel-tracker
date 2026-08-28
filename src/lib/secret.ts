import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Стале за часом порівняння секретів.
 *
 * Порівнюємо не самі рядки, а їхні SHA-256 — з двох причин. По-перше,
 * `timingSafeEqual` вимагає буферів однакової довжини й кидає виняток на
 * різній: хеш завжди 32 байти, тож довжина введеного не «протікає» через
 * помилку. По-друге, саме порівняння лишається сталим за часом, тож секрет
 * не підібрати символ за символом, вимірюючи час відповіді.
 *
 * Лише для Node-рантайму: `node:crypto` на Edge немає. Middleware, який там
 * і працює, секретів не звіряє — він дивиться тільки підпис куки.
 */
export function secretsMatch(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}
