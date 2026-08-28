import { monthKey, monthKeyOf, type IsoDate, type MonthKey } from "@/lib/date";
import {
  decimal2,
  decimal2FromDbString,
  divideDecimals,
  sumDecimals,
  type Decimal2,
} from "@/lib/units";

/** Заправки за один місяць, згорнуті в кілька чисел. */
export interface MonthlyFuelStats {
  month: MonthKey;
  liters: Decimal2;
  totalCost: Decimal2;
  /** Гроші поділені на літри, а не середнє цін окремих заправок. */
  averagePricePerLiter: Decimal2 | null;
  fillCount: number;
  /** Пробіг за місяць із показань одометра. `null`, якщо їх бракує. */
  distanceKm: number | null;
  /** Літрів на 100 км. `null`, якщо пробіг невідомий. */
  consumptionPer100Km: Decimal2 | null;
}

/** Рядок помісячної агрегації так, як його повертає SQL. */
export interface MonthlyAggregateRow {
  period: string;
  liters: string;
  totalCost: string;
  fillCount: number;
}

/** Показання одометра, зведене до пари «дата — кілометри». */
export interface OdometerPoint {
  recordedAt: IsoDate;
  odometerKm: number;
}

/**
 * Середня ціна за літр.
 *
 * Гроші поділені на літри, а не середнє арифметичне цін заправок: друге дало б
 * однакову вагу заправці на 5 літрів і на 50, і в місяці з однією дорогою
 * дозаправкою середня поповзла б угору без причини.
 */
export function averagePricePerLiter(
  totalCost: Decimal2,
  liters: Decimal2,
): Decimal2 | null {
  return liters > 0 ? divideDecimals(totalCost, liters) : null;
}

/**
 * Витрата на 100 км.
 *
 * Ділення в цілих сотих: (літри × 100) / км. Множення на 100 виконується до
 * ділення, інакше на коротких пробігах результат округлився б у нуль.
 */
export function consumptionPer100Km(
  liters: Decimal2,
  distanceKm: number | null,
): Decimal2 | null {
  if (distanceKm === null || distanceKm <= 0) return null;

  // `liters` — соті літра, `distanceKm` — цілі кілометри. Літрів на 100 км у
  // сотих це рівно liters × 100 / km: сотні з чисельника й знаменника
  // скорочуються, тож зайвого переведення одиниць тут немає.
  return decimal2(Math.round((liters * 100) / distanceKm));
}

/** Вартість кілометра. */
export function costPerKm(
  totalCost: Decimal2,
  distanceKm: number | null,
): Decimal2 | null {
  if (distanceKm === null || distanceKm <= 0) return null;
  return decimal2(Math.round(totalCost / distanceKm));
}

/**
 * Пробіг за кожен місяць із показань одометра.
 *
 * Показання нерегулярні, тож для місяця беремо різницю між останнім записом
 * усередині нього й останнім записом до нього. Якщо перед місяцем показань не
 * було, порівнювати нема з чим — і це чесніше, ніж рахувати від нуля.
 */
export function distanceByMonth(
  readings: readonly OdometerPoint[],
): Map<MonthKey, number> {
  const sorted = [...readings].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );

  const result = new Map<MonthKey, number>();
  /** Останнє показання, зроблене до початку поточного місяця. */
  let beforeMonth: OdometerPoint | null = null;
  let currentMonth: MonthKey | null = null;
  let lastSeen: OdometerPoint | null = null;

  for (const point of sorted) {
    const month = monthKeyOf(point.recordedAt);

    if (month !== currentMonth) {
      // Перейшли в наступний місяць: попереднє останнє показання стає точкою
      // відліку для нього.
      beforeMonth = lastSeen;
      currentMonth = month;
    }

    if (beforeMonth) {
      const distance = point.odometerKm - beforeMonth.odometerKm;
      if (distance > 0) result.set(month, distance);
    }

    lastSeen = point;
  }

  return result;
}

/**
 * Зводить помісячні суми з БД і показання одометра в один ряд для графіків.
 *
 * Місяці повертаються від найранішого до найпізнішого — саме в такому порядку
 * їх чекає вісь часу.
 */
export function buildMonthlyStats(
  rows: readonly MonthlyAggregateRow[],
  readings: readonly OdometerPoint[],
): MonthlyFuelStats[] {
  const distances = distanceByMonth(readings);

  return rows
    .map((row): MonthlyFuelStats => {
      const month = monthKey(row.period);
      const liters = decimal2FromDbString(row.liters);
      const totalCost = decimal2FromDbString(row.totalCost);
      const distanceKm = distances.get(month) ?? null;

      return {
        month,
        liters,
        totalCost,
        averagePricePerLiter: averagePricePerLiter(totalCost, liters),
        fillCount: row.fillCount,
        distanceKm,
        consumptionPer100Km: consumptionPer100Km(liters, distanceKm),
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Підсумок за весь час — для карток угорі сторінки. */
export interface StatsTotals {
  liters: Decimal2;
  totalCost: Decimal2;
  averagePricePerLiter: Decimal2 | null;
  fillCount: number;
  distanceKm: number | null;
  consumptionPer100Km: Decimal2 | null;
  costPerKm: Decimal2 | null;
}

export function totalsOf(months: readonly MonthlyFuelStats[]): StatsTotals {
  const liters = sumDecimals(months.map((month) => month.liters));
  const totalCost = sumDecimals(months.map((month) => month.totalCost));
  const fillCount = months.reduce((sum, month) => sum + month.fillCount, 0);

  // Пробіг сумуємо лише по місяцях, де він відомий: інакше один місяць без
  // показань занизив би підсумкову витрату, а не просто випав із неї.
  const known = months.filter((month) => month.distanceKm !== null);
  const distanceKm = known.length
    ? known.reduce((sum, month) => sum + (month.distanceKm ?? 0), 0)
    : null;
  const knownLiters = sumDecimals(known.map((month) => month.liters));
  const knownCost = sumDecimals(known.map((month) => month.totalCost));

  return {
    liters,
    totalCost,
    averagePricePerLiter: averagePricePerLiter(totalCost, liters),
    fillCount,
    distanceKm,
    consumptionPer100Km: consumptionPer100Km(knownLiters, distanceKm),
    costPerKm: costPerKm(knownCost, distanceKm),
  };
}

/**
 * Зміна показника проти попереднього місяця, у відсотках.
 *
 * `null`, коли порівнювати нема з чим: без попереднього значення або коли воно
 * нульове. «Зросло на нескінченність» — не той факт, який варто малювати.
 */
export function percentChange(
  current: Decimal2 | null,
  previous: Decimal2 | null,
): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
