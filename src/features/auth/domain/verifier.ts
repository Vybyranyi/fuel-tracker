/**
 * Спосіб підтвердити, що за застосунком той, кому він належить.
 *
 * Зараз реалізація одна — PIN. Заділ під Face ID саме тут: додати
 * `PasskeyVerifier` означатиме написати ще одну реалізацію цього інтерфейсу,
 * тоді як сесія, кука й middleware лишаться недоторканими. Без такої межі
 * перехід на біометрію довелося б розплітати по всьому шару входу.
 */
export interface AuthVerifier<TCredentials> {
  /** Як саме підтверджували — знадобиться в логах і в UI налаштувань. */
  readonly method: AuthMethod;
  verify(credentials: TCredentials): Promise<boolean>;
}

export type AuthMethod = "pin" | "passkey";

/** Скільки цифр у PIN. Змінюється тут і в схемі вводу одночасно. */
export const PIN_LENGTH = 4;
