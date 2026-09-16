import type { DateRange } from "@/features/costs/domain/cost-entry";
import type { FuelEntry } from "@/features/fuel/domain/fuel-entry";
import {
  SERVICE_ITEM_KIND_LABELS,
  splitByKind,
  type ServiceItem,
  type ServiceRecord,
} from "@/features/service/domain/service-record";
import {
  averagePricePerLiter,
  consumptionPer100Km,
  costPerKm,
  distanceByMonth,
  type OdometerPoint,
} from "@/features/stats/domain/monthly-stats";
import { monthKeyOf, type IsoDate, type MonthKey } from "@/lib/date";
import { formatNumericDate } from "@/lib/format";
import { decimal2ToNumber, sumDecimals, type Decimal2 } from "@/lib/units";
import type {
  ExportRequest,
  ExportSection,
  ExportTotal,
} from "@/features/export/domain/export-request";

/**
 * Клітинка документа — значення й те, що воно за типом.
 *
 * Не готовий текст: у таблиці Excel число має лишитись числом, інакше його не
 * підсумувати й не відсортувати, а саме заради цього туди й вивантажують. Як
 * воно виглядає, вирішує вже той, хто малює файл.
 *
 * Одиниця живе в заголовку колонки, а не в клітинці, — тому «гроші» й
 * «дробове число» тут не розрізняються: це те саме число з двома знаками.
 */
export type Cell =
  | { kind: "text"; value: string }
  | { kind: "date"; value: IsoDate }
  | { kind: "decimal"; value: number | null }
  | { kind: "integer"; value: number | null };

export const text = (value: string | null): Cell => ({
  kind: "text",
  value: value ?? "",
});

export const dateCell = (value: IsoDate): Cell => ({ kind: "date", value });

export const decimal = (value: Decimal2 | null): Cell => ({
  kind: "decimal",
  value: value === null ? null : decimal2ToNumber(value),
});

export const integer = (value: number | null): Cell => ({
  kind: "integer",
  value,
});

export interface ExportColumn {
  /** Разом з одиницею: «Сума, ₴». */
  label: string;
  /** Ширина в символах: XLSX бере її буквально, PDF — як частку рядка. */
  width: number;
  /** Числова колонка притискається праворуч — разом із заголовком. */
  numeric?: boolean;
}

export interface ExportTable {
  /** Назва аркуша в XLSX і заголовок розділу в PDF. */
  name: string;
  columns: ExportColumn[];
  rows: Cell[][];
}

export interface SummaryRow {
  label: string;
  value: Cell;
}

export interface ExportDocument {
  /** «Октавія» — назва авто. */
  title: string;
  /** «Skoda Octavia A7 · AA1234BB». Порожній рядок, якщо нічого не заповнено. */
  caption: string;
  /** «01.07.2026 — 30.09.2026» або «Увесь час». */
  period: string;
  tables: ExportTable[];
  summary: SummaryRow[];
  /** Назва файлу без розширення. */
  baseName: string;
}

export interface ExportInput {
  car: { name: string; makeModel: string | null; plate: string | null };
  request: ExportRequest;
  range: DateRange | null;
  fuel: readonly FuelEntry[];
  service: readonly ServiceRecord[];
  /** Усі показання одометра — з них рахується пробіг. */
  readings: readonly OdometerPoint[];
  /** Сьогодні — потрапляє в назву файлу. */
  today: IsoDate;
}

function has<T extends string>(list: readonly T[], value: T): boolean {
  return list.includes(value);
}

function byDate<T>(items: readonly T[], at: (item: T) => IsoDate): T[] {
  // Знизу вгору за часом: звіт читають згори вниз, і рік має розгортатись
  // уперед, а не назад, як у стрічці витрат на екрані.
  return [...items].sort((a, b) => at(a).localeCompare(at(b)));
}

function fuelTable(entries: readonly FuelEntry[]): ExportTable {
  return {
    name: "Заправки",
    columns: [
      { label: "Дата", width: 12 },
      { label: "Літри", width: 10, numeric: true },
      { label: "Ціна, ₴/л", width: 12, numeric: true },
      { label: "Сума, ₴", width: 14, numeric: true },
      { label: "Нотатка", width: 40 },
    ],
    rows: byDate(entries, (entry) => entry.filledAt).map((entry) => [
      dateCell(entry.filledAt),
      decimal(entry.volumeLiters),
      decimal(entry.pricePerLiter),
      decimal(entry.totalCost),
      text(entry.note),
    ]),
  };
}

function serviceTable(records: readonly ServiceRecord[]): ExportTable {
  return {
    name: "ТО",
    columns: [
      { label: "Дата", width: 12 },
      { label: "Пробіг, км", width: 12, numeric: true },
      { label: "СТО", width: 24 },
      { label: "Сума, ₴", width: 14, numeric: true },
      { label: "Нотатка", width: 40 },
    ],
    rows: byDate(records, (record) => record.performedAt).map((record) => [
      dateCell(record.performedAt),
      integer(record.odometerKm),
      text(record.vendor),
      decimal(record.totalCost),
      text(record.note),
    ]),
  };
}

function itemsTable(records: readonly ServiceRecord[]): ExportTable {
  const rows = byDate(records, (record) => record.performedAt).flatMap(
    (record) =>
      record.items.map((item) => [
        dateCell(record.performedAt),
        text(record.vendor),
        text(item.name),
        text(SERVICE_ITEM_KIND_LABELS[item.kind]),
        decimal(item.quantity),
        decimal(item.unitPrice),
        decimal(item.amount),
      ]),
  );

  return {
    name: "Позиції ТО",
    columns: [
      { label: "Дата", width: 12 },
      { label: "СТО", width: 20 },
      { label: "Назва", width: 30 },
      { label: "Вид", width: 14 },
      { label: "Кількість", width: 11, numeric: true },
      { label: "Ціна, ₴", width: 12, numeric: true },
      { label: "Сума, ₴", width: 14, numeric: true },
    ],
    rows,
  };
}

function allItems(records: readonly ServiceRecord[]): ServiceItem[] {
  return records.flatMap((record) => record.items);
}

/** Пробіг і гроші, які з ним співвідносяться. */
interface Measured {
  distanceKm: number | null;
  liters: Decimal2;
  fuelCost: Decimal2;
  totalCost: Decimal2;
}

/**
 * Те, що ділиться на кілометри.
 *
 * Не все підряд: у гру йдуть лише місяці, де є і записи, і відомий пробіг, —
 * рівно той самий відбір, що в `totalsOf` на сторінці статистики. Це не
 * педантизм: без нього ТО, зроблене після останнього показання одометра,
 * ділилося б на кілометри, яких ще не міряли, і ціна кілометра у файлі
 * розходилася б із тією, що на екрані. Одні й ті самі дані мусять давати одне
 * й те саме число, хоч куди на них дивись.
 */
function measure(
  fuel: readonly FuelEntry[],
  service: readonly ServiceRecord[],
  readings: readonly OdometerPoint[],
): Measured {
  const distances = distanceByMonth(readings);

  const withRecords = new Set<MonthKey>([
    ...fuel.map((entry) => monthKeyOf(entry.filledAt)),
    ...service.map((record) => monthKeyOf(record.performedAt)),
  ]);

  const known = [...withRecords].filter((month) => distances.has(month));

  const knownFuel = fuel.filter((entry) =>
    distances.has(monthKeyOf(entry.filledAt)),
  );
  const knownService = service.filter((record) =>
    distances.has(monthKeyOf(record.performedAt)),
  );

  const fuelCost = sumDecimals(knownFuel.map((entry) => entry.totalCost));
  const serviceCost = sumDecimals(
    knownService.map((record) => record.totalCost),
  );

  return {
    distanceKm: known.length
      ? known.reduce((sum, month) => sum + (distances.get(month) ?? 0), 0)
      : null,
    liters: sumDecimals(knownFuel.map((entry) => entry.volumeLiters)),
    fuelCost,
    totalCost: sumDecimals([fuelCost, serviceCost]),
  };
}

/**
 * Підсумки за вибраними групами.
 *
 * Рахуються з того, що потрапило у файл, а не з усієї бази: якщо вивантажують
 * тільки ТО, «разом» має дорівнювати сумі рядків нижче. Інакше документ
 * суперечив би сам собі, і зрозуміти, звідки взялась різниця, було б нізвідки.
 */
function buildSummary(
  totals: readonly ExportTotal[],
  fuel: readonly FuelEntry[],
  service: readonly ServiceRecord[],
  readings: readonly OdometerPoint[],
): SummaryRow[] {
  const liters = sumDecimals(fuel.map((entry) => entry.volumeLiters));
  const fuelCost = sumDecimals(fuel.map((entry) => entry.totalCost));
  const serviceCost = sumDecimals(service.map((record) => record.totalCost));
  const totalCost = sumDecimals([fuelCost, serviceCost]);
  const measured = measure(fuel, service, readings);

  const rows: SummaryRow[] = [];

  if (has(totals, "money")) {
    rows.push(
      { label: "Разом, ₴", value: decimal(totalCost) },
      { label: "Пальне, ₴", value: decimal(fuelCost) },
      { label: "ТО, ₴", value: decimal(serviceCost) },
    );
  }

  if (has(totals, "fuel")) {
    rows.push(
      { label: "Залито, л", value: decimal(liters) },
      {
        label: "Середня ціна, ₴/л",
        value: decimal(averagePricePerLiter(fuelCost, liters)),
      },
      { label: "Заправок", value: integer(fuel.length) },
    );
  }

  if (has(totals, "service")) {
    const kinds = splitByKind(allItems(service));

    rows.push(
      { label: "Записів ТО", value: integer(service.length) },
      { label: "Запчастини, ₴", value: decimal(kinds.part) },
      { label: "Робота, ₴", value: decimal(kinds.labour) },
    );
  }

  if (has(totals, "distance")) {
    rows.push(
      { label: "Пробіг, км", value: integer(measured.distanceKm) },
      {
        label: "Витрата, л/100 км",
        value: decimal(
          consumptionPer100Km(measured.liters, measured.distanceKm),
        ),
      },
    );
  }

  if (has(totals, "perKm")) {
    rows.push(
      {
        label: "Кілометр на пальному, ₴",
        value: decimal(costPerKm(measured.fuelCost, measured.distanceKm)),
      },
      {
        label: "Кілометр разом із ТО, ₴",
        value: decimal(costPerKm(measured.totalCost, measured.distanceKm)),
      },
    );
  }

  return rows;
}

/** Підпис під назвою авто — те, чим його впізнають у папері. */
function captionOf(car: ExportInput["car"]): string {
  return [car.makeModel, car.plate].filter(Boolean).join(" · ");
}

/**
 * Назва файлу — латиницею й з датою.
 *
 * Латиницею навмисно: назва авто може бути якою завгодно, а файл поїде в
 * пошту, месенджер і на чужий комп'ютер, де кирилиця в імені перетворюється
 * на набір відсотків. Що всередині — каже перший рядок документа.
 */
function baseNameOf(today: IsoDate): string {
  return `avto-vytraty-${today}`;
}

export function buildExportDocument(input: ExportInput): ExportDocument {
  const { car, request, range, today } = input;
  const sections: readonly ExportSection[] = request.sections;

  // Розділ вимкнено — його даних у документі немає взагалі, і підсумки теж
  // рахуються без них.
  const fuel = has(sections, "fuel") ? input.fuel : [];
  const service = has(sections, "service") ? input.service : [];

  const tables: ExportTable[] = [];
  if (has(sections, "fuel")) tables.push(fuelTable(fuel));
  if (has(sections, "service")) tables.push(serviceTable(service));
  // Позиції — подробиця записів ТО, тож без самих записів їх не буває.
  if (has(sections, "service") && has(sections, "items")) {
    tables.push(itemsTable(service));
  }

  return {
    title: car.name,
    caption: captionOf(car),
    period: describePeriod(range),
    tables,
    summary: buildSummary(request.totals, fuel, service, input.readings),
    baseName: baseNameOf(today),
  };
}

/** Проміжок словами — для шапки документа. */
export function describePeriod(range: DateRange | null): string {
  if (!range) return "Увесь час";
  return `${formatNumericDate(range.from)} — ${formatNumericDate(range.to)}`;
}
