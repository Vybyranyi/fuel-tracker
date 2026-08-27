import { isoDate, type IsoDate } from "@/lib/date";
import { formatKilometers } from "@/lib/format";

/** Показання одометра за конкретну дату. */
export interface OdometerReading {
  id: string;
  recordedAt: IsoDate;
  /** Ціле число кілометрів: дробового пробігу одометр не показує. */
  odometerKm: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ODOMETER_LIMITS = {
  min: 1,
  /** Дві сотні тисяч кілометрів на рік — і то за двадцять років не вийде. */
  max: 2_000_000,
  note: { maxLength: 500 },
} as const;

/**
 * Скільки кілометрів на добу вважаємо межею правдоподібності.
 *
 * Це не обмеження, а сітка від зайвої цифри: 152 340 замість 15 234 дає
 * стрибок, який жодне авто за місяць не проїде.
 */
const IMPLAUSIBLE_KM_PER_DAY = 2000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface OdometerRawRow {
  id: string;
  recordedAt: string;
  odometerKm: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function odometerReadingFromRow(row: OdometerRawRow): OdometerReading {
  return {
    id: row.id,
    recordedAt: isoDate(row.recordedAt),
    odometerKm: row.odometerKm,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Сусіднє показання, відносно якого перевіряємо нове. */
export interface NeighbourReading {
  recordedAt: IsoDate;
  odometerKm: number;
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  const diff = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.abs(diff) / MS_PER_DAY;
}

/**
 * Чи виглядає нове показання підозріло на тлі сусідніх.
 *
 * Повертає текст попередження або `null`. Саме попередження, а не заборона:
 * одометр міг бути замінений, а помилковий запис треба мати змогу виправити
 * вниз. Тому рішення лишається за людиною — але мовчки пропустити описку,
 * яка потім зіпсує всю статистику витрати, теж не можна.
 */
export function describeOdometerAnomaly(
  odometerKm: number,
  recordedAt: IsoDate,
  neighbours: {
    previous: NeighbourReading | null;
    next: NeighbourReading | null;
  },
): string | null {
  const { previous, next } = neighbours;

  if (previous && odometerKm < previous.odometerKm) {
    return `Менше за попереднє показання — ${formatKilometers(previous.odometerKm)}. Одометр не крутиться назад.`;
  }

  if (next && odometerKm > next.odometerKm) {
    return `Більше за наступне показання — ${formatKilometers(next.odometerKm)}.`;
  }

  if (previous) {
    const days = Math.max(1, daysBetween(previous.recordedAt, recordedAt));
    const perDay = (odometerKm - previous.odometerKm) / days;

    if (perDay > IMPLAUSIBLE_KM_PER_DAY) {
      return `Це ${formatKilometers(odometerKm - previous.odometerKm)} від попереднього показання. Схоже на зайву цифру.`;
    }
  }

  return null;
}

/**
 * Пробіг між двома показаннями. `null`, якщо порівнювати нема з чим або
 * значення суперечать одне одному.
 */
export function distanceBetween(
  from: NeighbourReading | null,
  to: NeighbourReading | null,
): number | null {
  if (!from || !to) return null;
  const distance = to.odometerKm - from.odometerKm;
  return distance >= 0 ? distance : null;
}
