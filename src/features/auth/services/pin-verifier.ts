import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { PIN_LENGTH, type AuthVerifier } from "@/features/auth/domain/verifier";

/**
 * Звірка PIN із тим, що задано в оточенні.
 *
 * Порівнюємо не рядки, а їхні SHA-256 — з двох причин. По-перше,
 * `timingSafeEqual` вимагає однакової довжини буферів і кидає виняток на
 * різній: хеш завжди 32 байти, тож довжина введеного не «протікає» через
 * помилку. По-друге, саме порівняння лишається сталим за часом, тож PIN не
 * можна підібрати цифра за цифрою, вимірюючи час відповіді.
 */
export class PinVerifier implements AuthVerifier<string> {
  readonly method = "pin" as const;

  // `async`, хоча всередині нічого не чекається: метод оголошений таким, що
  // повертає проміс, тож і збій має приходити відхиленим промісом. Інакше
  // виклик через `.catch()` пропустив би цю помилку повз себе.
  async verify(pin: string): Promise<boolean> {
    const expected = process.env.AUTH_PIN;

    if (!expected || expected.length !== PIN_LENGTH) {
      throw new Error(
        `AUTH_PIN має містити рівно ${PIN_LENGTH} цифри — див. .env.example`,
      );
    }

    return timingSafeEqual(sha256(pin), sha256(expected));
  }
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}
