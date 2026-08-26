import { type IsoDate, type MonthKey } from "@/lib/date";
import { decimal2ToNumber, type Decimal2 } from "@/lib/units";

const LOCALE = "uk-UA";

/**
 * Зводить усі варіанти нерозривного пробілу до одного символу.
 *
 * ICU в Node і в браузері не завжди однієї версії, і роздільник тисяч буває
 * то U+00A0, то U+202F. Для React це різний текст — на гідратації вилазить
 * попередження про розбіжність розмітки. Фіксуємо один символ: типографіка
 * лишається (число не розривається), а вивід стає однаковим усюди.
 */
const NON_BREAKING_SPACE = "\u00A0";

function normalizeSpaces(value: string): string {
  // U+202F narrow, U+2009 thin, U+2007 figure, U+2060 word-joiner, U+00A0 —
  // усе, чим різні збірки ICU розділяють тисячі.
  return value.replace(/[\u202F\u2009\u2007\u2060\u00A0]/g, NON_BREAKING_SPACE);
}

const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

/** Гроші: `2 351,49 ₴`. */
export function formatMoney(value: Decimal2): string {
  return normalizeSpaces(
    `${decimalFormatter.format(decimal2ToNumber(value))} ₴`,
  );
}

/** Обʼєм: `40,55 л`. */
export function formatLiters(value: Decimal2): string {
  return normalizeSpaces(
    `${decimalFormatter.format(decimal2ToNumber(value))} л`,
  );
}

/** Ціна за літр: `57,99 ₴/л`. */
export function formatPricePerLiter(value: Decimal2): string {
  return normalizeSpaces(
    `${decimalFormatter.format(decimal2ToNumber(value))} ₴/л`,
  );
}

/** Пробіг: `152 340 км`. */
export function formatKilometers(value: number): string {
  return normalizeSpaces(`${wholeFormatter.format(value)} км`);
}

/**
 * Значення для поля вводу: `40.55`.
 *
 * Свідомо з крапкою, а не комою: це те, що лежить у `<input>`, і воно має
 * читатись тим самим парсером, який приймає введене вручну.
 */
export function formatDecimalInput(value: Decimal2): string {
  return decimal2ToNumber(value).toFixed(2);
}

const dayMonthFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortMonthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  timeZone: "UTC",
});

/**
 * `IsoDate` — це вже календарна дата за Києвом, без часу. Щоб `Intl` не зсунув
 * її ще раз, розбираємо як опівніч UTC і форматуємо теж в UTC.
 */
function asUtcInstant(value: IsoDate | MonthKey): Date {
  const [year, month, day = "01"] = value.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/** `15 серпня` — для списку заправок у межах поточного року. */
export function formatDayMonth(date: IsoDate): string {
  return dayMonthFormatter.format(asUtcInstant(date));
}

/** `15 серпня 2026 р.` — повна дата. */
export function formatFullDate(date: IsoDate): string {
  return fullDateFormatter.format(asUtcInstant(date));
}

/**
 * `Серпень 2026` — заголовок місячного блоку.
 *
 * `Intl` дає «серпень 2026 р.» — граматично правильно, але як заголовок у
 * застосунку читається важко. Прибираємо «р.» і піднімаємо першу літеру.
 */
export function formatMonth(key: MonthKey): string {
  const formatted = monthFormatter
    .format(asUtcInstant(key))
    .replace(/\s*р\.$/u, "");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** `серп.` — підпис осі на графіку, де місця обмаль. */
export function formatMonthShort(key: MonthKey): string {
  return shortMonthFormatter.format(asUtcInstant(key));
}
