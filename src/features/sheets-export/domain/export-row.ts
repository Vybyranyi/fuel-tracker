import type { MonthlyFuelStats } from "@/features/stats/domain/monthly-stats";
import { formatMonth } from "@/lib/format";
import { decimal2ToNumber } from "@/lib/units";

/**
 * Шапка аркуша.
 *
 * Порядок колонок — це контракт із таблицею: рядки дописуються в кінець і
 * ніяк не звіряються з наявною шапкою, тож поміняти тут місцями дві колонки
 * означає зіпсувати всю історію нижче. Змінювати — лише додаючи в кінець.
 */
export const SHEET_HEADER = [
  "Місяць",
  "Літрів",
  "Витрачено, ₴",
  "Середня ціна/л, ₴",
  "Заправок",
  "Пробіг за місяць, км",
  "Витрата, л/100 км",
] as const;

/**
 * Значення комірки.
 *
 * Числа передаємо саме числами, а не форматованими рядками: рядок «1 234,56»
 * Google розбирає за локаллю самої таблиці, і на en_US він осів би текстом,
 * з яким не працює жодна формула. Порожній рядок — це «даних немає».
 */
export type SheetCell = string | number;
export type SheetRow = SheetCell[];

/** Порожня комірка для показника, якого за цей місяць немає. */
const EMPTY = "";

export function buildExportRow(stats: MonthlyFuelStats): SheetRow {
  return [
    formatMonth(stats.month),
    decimal2ToNumber(stats.liters),
    decimal2ToNumber(stats.totalCost),
    stats.averagePricePerLiter === null
      ? EMPTY
      : decimal2ToNumber(stats.averagePricePerLiter),
    stats.fillCount,
    stats.distanceKm ?? EMPTY,
    stats.consumptionPer100Km === null
      ? EMPTY
      : decimal2ToNumber(stats.consumptionPer100Km),
  ];
}

/**
 * Назва аркуша для A1-нотації.
 *
 * Google розбирає діапазон як текст, тож назву треба брати в одинарні лапки —
 * інакше «Витрати авто» перетвориться на посилання на аркуш «Витрати» з
 * хвостом, який нічого не значить. Одинарна лапка всередині назви подвоюється:
 * це той самий спосіб екранування, що і в SQL.
 */
export function quoteSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

/**
 * Літера колонки за її номером від нуля: 0 → A, 25 → Z, 26 → AA.
 *
 * Один `String.fromCharCode` тут працював би рівно до 26 колонок, а на 27-й
 * тихо дав би «[» замість «AA» — і діапазон поїхав би без жодної помилки.
 * Циклу на це рівно чотири рядки, тож дешевше зробити правильно, ніж лишити
 * пастку з поясненням.
 */
export function columnLetter(index: number): string {
  let letters = "";
  for (let rest = index; rest >= 0; rest = Math.floor(rest / 26) - 1) {
    letters = String.fromCharCode(65 + (rest % 26)) + letters;
  }
  return letters;
}

/** Остання колонка, яку займає рядок вивантаження. */
export const LAST_COLUMN = columnLetter(SHEET_HEADER.length - 1);

/** Діапазон усіх колонок аркуша — саме туди дописується новий рядок. */
export function sheetRange(name: string, cells: string): string {
  return `${quoteSheetName(name)}!${cells}`;
}
