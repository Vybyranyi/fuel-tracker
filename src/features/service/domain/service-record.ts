import { multiplyDecimals, sumDecimals, type Decimal2 } from "@/lib/units";
import type { IsoDate } from "@/lib/date";

/** Запчастина чи робота. Розділення потрібне, щоб бачити, за що саме платиш. */
export type ServiceItemKind = "part" | "labour";

export const SERVICE_ITEM_KIND_LABELS: Record<ServiceItemKind, string> = {
  part: "Запчастина",
  labour: "Робота",
};

export const SERVICE_ITEM_KINDS = Object.keys(
  SERVICE_ITEM_KIND_LABELS,
) as ServiceItemKind[];

export interface ServiceItem {
  name: string;
  quantity: Decimal2;
  unitPrice: Decimal2;
  amount: Decimal2;
  kind: ServiceItemKind;
}

export interface ServiceRecord {
  id: string;
  performedAt: IsoDate;
  odometerKm: number | null;
  vendor: string | null;
  note: string | null;
  totalCost: Decimal2;
  items: ServiceItem[];
}

/**
 * Скільки коштує позиція.
 *
 * Та сама арифметика, що в заправці: кількість і ціна — з двома знаками,
 * добуток округлюється назад до двох. Інакше 0.75 л оливи по 389.90 давали б
 * дріб, який ніде не показати.
 */
export function computeItemAmount(
  quantity: Decimal2,
  unitPrice: Decimal2,
): Decimal2 {
  return multiplyDecimals(quantity, unitPrice);
}

/**
 * Сума запису — сума позицій.
 *
 * Складаємо вже округлені суми позицій, а не перемножуємо все заново: у
 * підсумку має вийти рівно те, що видно рядками, інакше «разом» не збігалося б
 * із тим, що людина може скласти сама на калькуляторі.
 */
export function totalOfItems(
  items: readonly Pick<ServiceItem, "amount">[],
): Decimal2 {
  return sumDecimals(items.map((item) => item.amount));
}

/** Скільки пішло на залізо, а скільки майстрам. */
export function splitByKind(
  items: readonly ServiceItem[],
): Record<ServiceItemKind, Decimal2> {
  return {
    part: totalOfItems(items.filter((item) => item.kind === "part")),
    labour: totalOfItems(items.filter((item) => item.kind === "labour")),
  };
}
