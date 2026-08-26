declare const isoDateBrand: unique symbol;
declare const monthKeyBrand: unique symbol;

/**
 * Календарна дата без часу, у форматі `YYYY-MM-DD` — те саме, що зберігає
 * колонка `date` у Postgres.
 */
export type IsoDate = string & { readonly [isoDateBrand]: true };

/** Місяць у форматі `YYYY-MM` — ключ для помісячних звітів і вивантажень. */
export type MonthKey = string & { readonly [monthKeyBrand]: true };

/**
 * Часовий пояс застосунку.
 *
 * Сервер працює в UTC, і о 22:00 за Києвом там уже наступна доба. Якби
 * «сьогодні» бралось із серверного часу, вечірня заправка потрапляла б на
 * завтрашню дату, а нагадування «останній день місяця» приходило б на день
 * раніше. Тому дату завжди рахуємо в цьому поясі, а не в поясі процесу.
 */
export const APP_TIME_ZONE = "Europe/Kyiv";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

/**
 * Перевіряє формат і — головне — що така дата справді існує.
 *
 * Регулярка пропустила б `2026-02-30`; `Date.UTC` нормалізує таке в 2 березня,
 * тож зайвий день видно за розбіжністю з тим, що прийшло.
 */
export function isoDate(value: string): IsoDate {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new TypeError(
      `Очікувалась дата у форматі YYYY-MM-DD, отримано ${value}`,
    );
  }

  const [year, month, day] = value.split("-").map(Number);
  const asUtc = new Date(Date.UTC(year, month - 1, day));

  if (
    asUtc.getUTCFullYear() !== year ||
    asUtc.getUTCMonth() !== month - 1 ||
    asUtc.getUTCDate() !== day
  ) {
    throw new RangeError(`Такої дати не існує: ${value}`);
  }

  return value as IsoDate;
}

/** Перевіряє формат `YYYY-MM` разом із діапазоном місяця. */
export function monthKey(value: string): MonthKey {
  if (!MONTH_KEY_PATTERN.test(value)) {
    throw new TypeError(
      `Очікувався місяць у форматі YYYY-MM, отримано ${value}`,
    );
  }
  return value as MonthKey;
}

/**
 * Розкладає момент часу на календарні частини в київському поясі.
 *
 * `formatToParts` замість трюків із локалями: локаль тут відповідає лише за
 * порядок частин, а ми беремо їх за назвою, тож результат не залежить від
 * того, як саме ICU вирішить розставити роздільники.
 */
function kyivParts(instant: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type);
    if (!part) throw new Error(`Intl не повернув частину дати: ${type}`);
    return Number(part.value);
  };

  return { year: read("year"), month: read("month"), day: read("day") };
}

const pad = (value: number, length = 2): string =>
  String(value).padStart(length, "0");

/** Сьогоднішня дата за Києвом. */
export function todayInKyiv(instant: Date = new Date()): IsoDate {
  const { year, month, day } = kyivParts(instant);
  return isoDate(`${pad(year, 4)}-${pad(month)}-${pad(day)}`);
}

/** Поточний місяць за Києвом. */
export function currentMonthKey(instant: Date = new Date()): MonthKey {
  const { year, month } = kyivParts(instant);
  return monthKey(`${pad(year, 4)}-${pad(month)}`);
}

/** Місяць, якому належить дата. */
export function monthKeyOf(date: IsoDate): MonthKey {
  return monthKey(date.slice(0, 7));
}

/** Попередній місяць — саме його вивантажуємо в Sheets першого числа. */
export function previousMonthKey(key: MonthKey): MonthKey {
  const [year, month] = key.split("-").map(Number);
  return month === 1
    ? monthKey(`${pad(year - 1, 4)}-12`)
    : monthKey(`${pad(year, 4)}-${pad(month - 1)}`);
}

/** Наступний місяць. */
export function nextMonthKey(key: MonthKey): MonthKey {
  const [year, month] = key.split("-").map(Number);
  return month === 12
    ? monthKey(`${pad(year + 1, 4)}-01`)
    : monthKey(`${pad(year, 4)}-${pad(month + 1)}`);
}

/** Скільки днів у місяці — з урахуванням високосних років. */
export function daysInMonth(key: MonthKey): number {
  const [year, month] = key.split("-").map(Number);
  // Нульовий день наступного місяця — це останній день поточного.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Межі місяця, включно з обома краями — саме в такому вигляді вони йдуть
 * у запит `filled_at BETWEEN … AND …`.
 */
export function monthRange(key: MonthKey): { start: IsoDate; end: IsoDate } {
  return {
    start: isoDate(`${key}-01`),
    end: isoDate(`${key}-${pad(daysInMonth(key))}`),
  };
}

/** Чи це останній день свого місяця — сигнал надіслати нагадування про пробіг. */
export function isLastDayOfMonth(date: IsoDate): boolean {
  return Number(date.slice(8, 10)) === daysInMonth(monthKeyOf(date));
}

/** Чи це перше число — сигнал вивантажити попередній місяць у Sheets. */
export function isFirstDayOfMonth(date: IsoDate): boolean {
  return date.slice(8, 10) === "01";
}
