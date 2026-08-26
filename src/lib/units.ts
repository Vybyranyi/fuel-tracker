declare const decimal2Brand: unique symbol;

/**
 * Число з двома знаками після коми, представлене цілою кількістю сотих:
 * 40.55 л → 4055, 57.99 ₴ → 5799.
 *
 * Чому не звичайний `number`. Обчислення в застосунку — це множення обʼєму
 * на ціну і ділення суми на ціну; у подвійній точності 0.1 + 0.2 ≠ 0.3, і на
 * сумах за місяць така похибка накопичується. У цілих усе точно.
 *
 * Чому бренд. `4055` і `40.55` — обидва просто `number`, і переплутати їх
 * нічого не заважає: помилка тиха, а результат розходиться в сто разів.
 * Бренд робить таку підстановку помилкою компіляції, а єдиний спосіб
 * отримати `Decimal2` — конструктори нижче.
 */
export type Decimal2 = number & { readonly [decimal2Brand]: true };

/** Скільки сотих в одиниці. */
const SCALE = 100;

/**
 * Верхня межа для множення двох `Decimal2`.
 *
 * `multiplyDecimals` рахує a × b до ділення, тож саме добуток має лишатись
 * у безпечному діапазоні цілих. Явна перевірка краща за тихо неправильну
 * відповідь після втрати точності.
 */
const MAX_SAFE_PRODUCT = Number.MAX_SAFE_INTEGER;

/**
 * Округлення «пів — від нуля».
 *
 * `Math.round` округлює половину в бік +∞, тому −0.5 дає −0, а не −1.
 * Значення в застосунку додатні, але правило має бути симетричним, інакше
 * воно почне брехати на першому ж відʼємному проміжному результаті.
 */
function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Створює `Decimal2` з цілої кількості сотих. */
export function decimal2(hundredths: number): Decimal2 {
  if (!Number.isSafeInteger(hundredths)) {
    throw new RangeError(
      `Decimal2 очікує ціле число сотих у безпечному діапазоні, отримано ${hundredths}`,
    );
  }
  return hundredths as Decimal2;
}

/** Нуль — найчастіший стартовий стан форми й акумулятор для сум. */
export const DECIMAL2_ZERO = decimal2(0);

/**
 * Читає значення з БД.
 *
 * Drizzle віддає `numeric` рядком ("40.50"), а не числом — саме щоб ніхто
 * не почав рахувати гроші у float. Тут цей рядок стає цілими сотими.
 */
export function decimal2FromDbString(value: string): Decimal2 {
  const parsed = parseDecimal2(value);
  if (parsed === null) {
    throw new TypeError(
      `З БД прийшло не десяткове число: ${JSON.stringify(value)}`,
    );
  }
  return parsed;
}

/**
 * Готує значення для БД: завжди рівно два знаки, крапка як роздільник.
 */
export function decimal2ToDbString(value: Decimal2): string {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const whole = Math.trunc(absolute / SCALE);
  const fraction = absolute % SCALE;
  return `${sign}${whole}.${String(fraction).padStart(2, "0")}`;
}

/**
 * Звичайне число — для графіків і для `Intl`, які працюють з `number`.
 * Для арифметики не використовується: там саме та точність, якої ми уникаємо.
 */
export function decimal2ToNumber(value: Decimal2): number {
  return value / SCALE;
}

/** Округлює звичайне число до двох знаків. Точка входу для тестів і сідів. */
export function decimal2FromNumber(value: number): Decimal2 {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Очікувалось скінченне число, отримано ${value}`);
  }
  return decimal2(roundHalfAwayFromZero(value * SCALE));
}

/**
 * Розбирає те, що ввела людина: "40,55", "40.55", "40", ",5".
 *
 * Кома й крапка рівноправні — на українській розкладці кома природніша, а на
 * цифровій клавіатурі айфона під рукою може бути будь-яка. Порожній рядок —
 * це не помилка, а «ще не ввели», тому `null`, а не виняток.
 */
export function parseDecimal2(input: string): Decimal2 | null {
  const normalized = input.trim().replace(",", ".");
  if (normalized === "") return null;

  // Одне число зі знаком: обовʼязково хоча б одна цифра, дробова частина
  // будь-якої довжини — зайві знаки просто округлимо.
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return decimal2FromNumber(value);
}

/** Сума значень — точна, бо це додавання цілих. */
export function sumDecimals(values: readonly Decimal2[]): Decimal2 {
  return decimal2(values.reduce<number>((total, value) => total + value, 0));
}

/**
 * Добуток двох величин з двома знаками, округлений назад до двох знаків.
 *
 * У сотих це (a × b) / 100: 40.55 л × 57.99 ₴ = 4055 × 5799 / 100 = 235 149,
 * тобто 2351.49 ₴.
 */
export function multiplyDecimals(a: Decimal2, b: Decimal2): Decimal2 {
  const product = a * b;
  if (Math.abs(product) > MAX_SAFE_PRODUCT) {
    throw new RangeError("Добуток вийшов за межі точних цілих");
  }
  return decimal2(roundHalfAwayFromZero(product / SCALE));
}

/**
 * Частка двох величин з двома знаками, округлена до двох знаків.
 *
 * У сотих це (a × 100) / b: 2351.49 ₴ / 57.99 ₴ = 235149 × 100 / 5799 ≈ 4055,
 * тобто 40.55 л.
 */
export function divideDecimals(a: Decimal2, b: Decimal2): Decimal2 {
  if (b === 0) {
    throw new RangeError("Ділення на нуль");
  }
  const scaled = a * SCALE;
  if (Math.abs(scaled) > MAX_SAFE_PRODUCT) {
    throw new RangeError("Ділене вийшло за межі точних цілих");
  }
  return decimal2(roundHalfAwayFromZero(scaled / b));
}
