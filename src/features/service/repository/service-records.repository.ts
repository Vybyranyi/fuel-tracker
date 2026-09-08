import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { withCarScope, type CarScope, type Tx } from "@/db";
import { serviceItems, serviceRecords } from "@/db/schema";
import {
  totalOfItems,
  type ServiceItem,
  type ServiceItemKind,
  type ServiceRecord,
} from "@/features/service/domain/service-record";
import type { IsoDate } from "@/lib/date";
import {
  decimal2FromDbString,
  decimal2ToDbString,
  type Decimal2,
} from "@/lib/units";

/** Позиція так, як її приймає репозиторій: сума вже дорахована сервісом. */
export interface ItemToSave {
  position: number;
  name: string;
  quantity: Decimal2;
  unitPrice: Decimal2;
  amount: Decimal2;
  kind: string;
}

export interface RecordToSave {
  performedAt: IsoDate;
  odometerKm: number | null;
  vendor: string | null;
  note: string | null;
  items: ItemToSave[];
}

type ItemRow = {
  serviceRecordId: string;
  name: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  kind: string;
};

function toItem(row: ItemRow): ServiceItem {
  return {
    name: row.name,
    quantity: decimal2FromDbString(row.quantity),
    unitPrice: decimal2FromDbString(row.unitPrice),
    amount: decimal2FromDbString(row.amount),
    kind: row.kind as ServiceItemKind,
  };
}

/**
 * Читає записи разом із позиціями.
 *
 * Двома запитами, а не JOIN-ом: приєднання розмножило б кожен запис на
 * кількість його позицій, і суму довелося б збирати назад у памʼяті, вручну
 * розрізняючи, де новий запис, а де ще той самий.
 */
async function loadRecords(
  tx: Tx,
  scope: CarScope,
  limit: number,
): Promise<ServiceRecord[]> {
  const records = await tx
    .select()
    .from(serviceRecords)
    .where(eq(serviceRecords.carId, scope.carId))
    .orderBy(desc(serviceRecords.performedAt), desc(serviceRecords.createdAt))
    .limit(limit);

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
    const list = byRecord.get(row.serviceRecordId);
    if (list) list.push(toItem(row));
    else byRecord.set(row.serviceRecordId, [toItem(row)]);
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

export function listRecords(
  scope: CarScope,
  limit: number,
): Promise<ServiceRecord[]> {
  return withCarScope(scope, (tx) => loadRecords(tx, scope, limit));
}

export function findRecord(
  scope: CarScope,
  id: string,
): Promise<ServiceRecord | null> {
  return withCarScope(scope, async (tx) => {
    const [record] = await tx
      .select()
      .from(serviceRecords)
      .where(
        and(eq(serviceRecords.id, id), eq(serviceRecords.carId, scope.carId)),
      )
      .limit(1);

    if (!record) return null;

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
      .where(eq(serviceItems.serviceRecordId, record.id))
      .orderBy(asc(serviceItems.position));

    return {
      id: record.id,
      performedAt: record.performedAt as IsoDate,
      odometerKm: record.odometerKm,
      vendor: record.vendor,
      note: record.note,
      totalCost: decimal2FromDbString(record.totalCost),
      items: items.map(toItem),
    };
  });
}

/** Рядки позицій під вставку. Сума запису рахується з тих самих чисел. */
function itemRows(recordId: string, items: ItemToSave[]) {
  return items.map((item) => ({
    serviceRecordId: recordId,
    position: item.position,
    name: item.name,
    quantity: decimal2ToDbString(item.quantity),
    unitPrice: decimal2ToDbString(item.unitPrice),
    amount: decimal2ToDbString(item.amount),
    kind: item.kind as "part" | "labour",
  }));
}

function totalFor(items: ItemToSave[]): string {
  return decimal2ToDbString(
    totalOfItems(
      items.map((item) => ({ ...item, kind: "part" }) as ServiceItem),
    ),
  );
}

/**
 * Записує ТО разом із позиціями — однією транзакцією.
 *
 * Інакше збій на другому запиті лишив би запис без позицій і з підсумком,
 * якому нічого не відповідає.
 */
export async function insertRecord(
  scope: CarScope,
  input: RecordToSave,
): Promise<string> {
  return withCarScope(scope, async (tx) => {
    const [record] = await tx
      .insert(serviceRecords)
      .values({
        carId: scope.carId,
        performedAt: input.performedAt,
        odometerKm: input.odometerKm,
        vendor: input.vendor,
        note: input.note,
        totalCost: totalFor(input.items),
      })
      .returning({ id: serviceRecords.id });

    if (!record) throw new Error("INSERT не повернув рядок");

    await tx.insert(serviceItems).values(itemRows(record.id, input.items));

    return record.id;
  });
}

/**
 * Оновлює ТО.
 *
 * Позиції переписуються повністю: зіставляти старі з новими означало б
 * вирішувати, чи «олива 4 л» і «олива 5 л» — та сама позиція, змінена, чи
 * різні. Правильної відповіді тут немає, а список короткий.
 */
export async function updateRecord(
  scope: CarScope,
  id: string,
  input: RecordToSave,
): Promise<boolean> {
  return withCarScope(scope, async (tx) => {
    const [record] = await tx
      .update(serviceRecords)
      .set({
        performedAt: input.performedAt,
        odometerKm: input.odometerKm,
        vendor: input.vendor,
        note: input.note,
        totalCost: totalFor(input.items),
        updatedAt: new Date(),
      })
      .where(
        and(eq(serviceRecords.id, id), eq(serviceRecords.carId, scope.carId)),
      )
      .returning({ id: serviceRecords.id });

    if (!record) return false;

    await tx
      .delete(serviceItems)
      .where(eq(serviceItems.serviceRecordId, record.id));
    await tx.insert(serviceItems).values(itemRows(record.id, input.items));

    return true;
  });
}

export async function deleteRecord(
  scope: CarScope,
  id: string,
): Promise<boolean> {
  const rows = await withCarScope(scope, (tx) =>
    tx
      .delete(serviceRecords)
      .where(
        and(eq(serviceRecords.id, id), eq(serviceRecords.carId, scope.carId)),
      )
      .returning({ id: serviceRecords.id }),
  );

  return rows.length > 0;
}
