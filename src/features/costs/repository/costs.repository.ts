import "server-only";

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { withCarScope, type CarScope, type Tx } from "@/db";
import { fuelEntries, serviceItems, serviceRecords } from "@/db/schema";
import type { DateRange } from "@/features/costs/domain/cost-entry";
import {
  fuelEntryFromRow,
  type FuelEntry,
} from "@/features/fuel/domain/fuel-entry";
import type {
  ServiceItem,
  ServiceItemKind,
  ServiceRecord,
} from "@/features/service/domain/service-record";
import type { IsoDate } from "@/lib/date";
import { decimal2FromDbString } from "@/lib/units";

/**
 * Читає обидва види витрат за один прохід.
 *
 * Свій репозиторій, а не звертання в чужі: це модель для читання, яка
 * охоплює дві сутності, і власні запити дозволяють узяти їх однією
 * транзакцією — тобто одним підключенням і однією виставленою роллю.
 *
 * Фільтруємо за датою в SQL, а текст шукаємо вже в домені. На цих обсягах
 * (десятки записів на рік) різниці немає, зате пошук лишається чистою
 * функцією, яку видно з тестів, а не `ilike` по трьох таблицях.
 */
export interface CostRows {
  fuel: FuelEntry[];
  service: ServiceRecord[];
}

function dateFilter(
  column: typeof fuelEntries.filledAt | typeof serviceRecords.performedAt,
  range: DateRange | null,
) {
  return range ? [gte(column, range.from), lte(column, range.to)] : [];
}

async function loadFuel(
  tx: Tx,
  scope: CarScope,
  range: DateRange | null,
): Promise<FuelEntry[]> {
  const rows = await tx
    .select()
    .from(fuelEntries)
    .where(
      and(
        eq(fuelEntries.carId, scope.carId),
        ...dateFilter(fuelEntries.filledAt, range),
      ),
    )
    .orderBy(desc(fuelEntries.filledAt), desc(fuelEntries.createdAt));

  return rows.map(fuelEntryFromRow);
}

async function loadService(
  tx: Tx,
  scope: CarScope,
  range: DateRange | null,
): Promise<ServiceRecord[]> {
  const records = await tx
    .select()
    .from(serviceRecords)
    .where(
      and(
        eq(serviceRecords.carId, scope.carId),
        ...dateFilter(serviceRecords.performedAt, range),
      ),
    )
    .orderBy(desc(serviceRecords.performedAt), desc(serviceRecords.createdAt));

  if (records.length === 0) return [];

  const items = await tx
    .select({
      serviceRecordId: serviceItems.serviceRecordId,
      name: serviceItems.name,
      quantity: serviceItems.quantity,
      unitPrice: serviceItems.unitPrice,
      amount: serviceItems.amount,
      kind: serviceItems.kind,
    })
    .from(serviceItems)
    .where(
      inArray(
        serviceItems.serviceRecordId,
        records.map((record) => record.id),
      ),
    )
    .orderBy(asc(serviceItems.position));

  const byRecord = new Map<string, ServiceItem[]>();
  for (const row of items) {
    const item: ServiceItem = {
      name: row.name,
      quantity: decimal2FromDbString(row.quantity),
      unitPrice: decimal2FromDbString(row.unitPrice),
      amount: decimal2FromDbString(row.amount),
      kind: row.kind as ServiceItemKind,
    };

    const list = byRecord.get(row.serviceRecordId);
    if (list) list.push(item);
    else byRecord.set(row.serviceRecordId, [item]);
  }

  return records.map((record) => ({
    id: record.id,
    performedAt: record.performedAt as IsoDate,
    odometerKm: record.odometerKm,
    vendor: record.vendor,
    note: record.note,
    totalCost: decimal2FromDbString(record.totalCost),
    items: byRecord.get(record.id) ?? [],
  }));
}

export function listCosts(
  scope: CarScope,
  range: DateRange | null,
  kinds: { fuel: boolean; service: boolean },
): Promise<CostRows> {
  return withCarScope(scope, async (tx) => ({
    // Порожній розділ не читаємо взагалі: фільтр «тільки ТО» не має
    // піднімати з бази всі заправки, щоб потім їх відкинути.
    fuel: kinds.fuel ? await loadFuel(tx, scope, range) : [],
    service: kinds.service ? await loadService(tx, scope, range) : [],
  }));
}
