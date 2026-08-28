import "server-only";

import { PIN_LENGTH, type AuthVerifier } from "@/features/auth/domain/verifier";
import { secretsMatch } from "@/lib/secret";

/**
 * Звірка PIN із тим, що задано в оточенні.
 *
 * Порівняння — стале за часом (див. `secretsMatch`): для чотирьох цифр темп
 * спроб і є єдиним реальним захистом, тож підказувати підбору нічим не варто.
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

    return secretsMatch(pin, expected);
  }
}
