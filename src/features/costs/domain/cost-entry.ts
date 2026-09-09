import type { FuelEntry } from "@/features/fuel/domain/fuel-entry";
import type { ServiceRecord } from "@/features/service/domain/service-record";
import {
  isoDate,
  monthKeyOf,
  monthRange,
  previousMonthKey,
  type IsoDate,
} from "@/lib/date";
import { sumDecimals, type Decimal2 } from "@/lib/units";

/**
 * Витрата — заправка або обслуговування.
 *
 * Розмічений union, а не спільна пласка форма: у списку заправка показує
 * літри й ціну, а ТО — позиції, і зводити це до однакових полів означало б
 * втратити саме те, заради чого на них дивляться.
 */
export type CostEntry =
  | {
      kind: "fuel";
      id: string;
      occurredAt: IsoDate;
      amount: Decimal2;
      entry: FuelEntry;
    }
  | {
      kind: "service";
      id: string;
      occurredAt: IsoDate;
      amount: Decimal2;
      record: ServiceRecord;
    };

export type CostKind = CostEntry["kind"];

export const COST_KIND_LABELS: Record<CostKind | "all", string> = {
  all: "Усе",
  fuel: "Пальне",
  service: "ТО",
};

/**
 * Зводить два потоки в один, найновіше згори.
 *
 * За однакової дати заправка йде першою — не тому, що важливіша, а щоб
 * порядок був сталим: без другого ключа сортування два записи одного дня
 * міняються місцями між заходами, і список «блимає».
 */
export function mergeCosts(
  fuel: readonly FuelEntry[],
  service: readonly ServiceRecord[],
): CostEntry[] {
  const entries: CostEntry[] = [
    ...fuel.map((item): CostEntry => ({
      kind: "fuel",
      id: item.id,
      occurredAt: item.filledAt,
      amount: item.totalCost,
      entry: item,
    })),
    ...service.map((item): CostEntry => ({
      kind: "service",
      id: item.id,
      occurredAt: item.performedAt,
      amount: item.totalCost,
      record: item,
    })),
  ];

  return entries.sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) {
      return a.occurredAt < b.occurredAt ? 1 : -1;
    }
    return a.kind === b.kind ? 0 : a.kind === "fuel" ? -1 : 1;
  });
}

export function totalOfCosts(entries: readonly CostEntry[]): Decimal2 {
  return sumDecimals(entries.map((entry) => entry.amount));
}

/** Проміжки, які пропонуємо замість двох полів із датами. */
export const COST_PERIODS = [
  "month",
  "previous-month",
  "quarter",
  "year",
  "all",
] as const;

export type CostPeriod = (typeof COST_PERIODS)[number];

/**
 * Що показуємо, поки нічого не вибрали.
 *
 * Тримається тут, а не в сторінці й панелі окремо: обидві вирішують, чи
 * лишати параметр в адресі, і розійшовшись, вони почали б показувати різне.
 */
export const DEFAULT_COST_PERIOD: CostPeriod = "quarter";
export const DEFAULT_COST_KIND = "all" as const;

export const COST_PERIOD_LABELS: Record<CostPeriod, string> = {
  month: "Цей місяць",
  "previous-month": "Минулий місяць",
  quarter: "3 місяці",
  year: "Цей рік",
  all: "Увесь час",
};

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

/** `monthRange` віддає `start`/`end` — тут ті самі межі звуться `from`/`to`. */
function toRange({ start, end }: { start: IsoDate; end: IsoDate }): DateRange {
  return { from: start, to: end };
}

/**
 * Перетворює пресет на межі дат.
 *
 * `null` означає «без обмеження» — так запит не отримує штучних меж на кшталт
 * 1970 року, які довелося б окремо не забути при кожній зміні.
 */
export function resolvePeriod(
  period: CostPeriod,
  today: IsoDate,
): DateRange | null {
  if (period === "all") return null;

  const month = monthKeyOf(today);

  switch (period) {
    case "month":
      return toRange(monthRange(month));

    case "previous-month":
      return toRange(monthRange(previousMonthKey(month)));

    case "quarter":
      // Три місяці разом із поточним: «останні три», а не «три попередні».
      return {
        from: monthRange(previousMonthKey(previousMonthKey(month))).start,
        to: monthRange(month).end,
      };

    case "year": {
      const year = today.slice(0, 4);
      return { from: isoDate(`${year}-01-01`), to: isoDate(`${year}-12-31`) };
    }
  }
}

/**
 * Чи згадується текст у записі.
 *
 * Шукаємо там, куди люди пишуть словами: нотатка, назва СТО, назви позицій.
 * Числа не шукаємо навмисно — «450» збіглося б із половиною історії.
 */
export function matchesQuery(entry: CostEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;

  const haystack =
    entry.kind === "fuel"
      ? [entry.entry.note]
      : [
          entry.record.note,
          entry.record.vendor,
          ...entry.record.items.map((item) => item.name),
        ];

  return haystack.some((value) => value?.toLowerCase().includes(needle));
}
