import { createSafeActionClient } from "next-safe-action";

/**
 * Що бачить користувач, коли сталося щось непередбачене.
 *
 * Своє формулювання, а не типове з бібліотеки: те англійською, і посеред
 * україномовного інтерфейсу виглядало б як збій самого застосунку.
 */
const GENERIC_ERROR_MESSAGE = "Щось пішло не так. Спробуйте ще раз.";

/**
 * Помилка, яку можна показати користувачеві дослівно.
 *
 * Усе решта — збій драйвера, обрив мережі до Neon, зламаний рядок у базі —
 * назовні йде одним нейтральним текстом: у повідомленнях таких помилок
 * трапляються фрагменти рядка підключення, і віддавати їх у браузер не варто.
 */
export class UserFacingError extends Error {
  readonly name = "UserFacingError";
}

/**
 * Спільний клієнт для всіх server actions.
 *
 * Дає одну точку, де валідується вхід і перехоплюються винятки, тож самі дії
 * лишаються короткими: розібрати вхід → покликати сервіс → оновити кеш.
 */
export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof UserFacingError) {
      return error.message;
    }

    // Деталі лишаються в логах Versel, до браузера не доходять.
    console.error("Server action failed:", error);
    return GENERIC_ERROR_MESSAGE;
  },
});
