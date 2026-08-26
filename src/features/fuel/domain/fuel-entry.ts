import { isoDate, type IsoDate } from "@/lib/date";
import {
  decimal2FromDbString,
  decimal2FromNumber,
  type Decimal2,
} from "@/lib/units";

/** Заправка у вигляді, з яким працює застосунок. */
export interface FuelEntry {
  id: string;
  filledAt: IsoDate;
  volumeLiters: Decimal2;
  pricePerLiter: Decimal2;
  totalCost: Decimal2;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Значення заправки без службових полів — те, що вводить користувач. */
export type FuelEntryAmountsInput = Pick<
  FuelEntry,
  "filledAt" | "volumeLiters" | "pricePerLiter" | "totalCost" | "note"
>;

/**
 * Розумні межі для полів.
 *
 * Це не бізнес-правила, а сітка від помилок вводу: 40000 замість 40 літрів
 * або зайвий нуль у ціні. Верхні межі свідомо з великим запасом — краще
 * пропустити дивну, але справжню заправку, ніж заблокувати внесення через
 * те, що ціни за кілька років виросли.
 */
export const FUEL_ENTRY_LIMITS = {
  volumeLiters: { min: decimal2FromNumber(0.01), max: decimal2FromNumber(500) },
  pricePerLiter: {
    min: decimal2FromNumber(0.01),
    max: decimal2FromNumber(1000),
  },
  totalCost: { min: decimal2FromNumber(0.01), max: decimal2FromNumber(500000) },
  note: { maxLength: 500 },
} as const;

/**
 * Рядок так, як його віддає Drizzle: `numeric` рядками, `date` рядком.
 *
 * Тип описаний тут структурно, а не імпортом із `@/db`, щоб функція нижче
 * лишалась частиною домену — без бази її можна викликати й протестувати.
 */
export interface FuelEntryRawRow {
  id: string;
  filledAt: string;
  volumeLiters: string;
  pricePerLiter: string;
  totalCost: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Перетворює рядок БД на доменний обʼєкт.
 *
 * Тут і тільки тут рядки з `numeric` стають `Decimal2`, а `filled_at` —
 * перевіреним `IsoDate`. Якщо в базі колись опиниться щось непридатне,
 * помилка вилізе саме на цій межі, а не десь у розрахунку статистики.
 */
export function fuelEntryFromRow(row: FuelEntryRawRow): FuelEntry {
  return {
    id: row.id,
    filledAt: isoDate(row.filledAt),
    volumeLiters: decimal2FromDbString(row.volumeLiters),
    pricePerLiter: decimal2FromDbString(row.pricePerLiter),
    totalCost: decimal2FromDbString(row.totalCost),
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
