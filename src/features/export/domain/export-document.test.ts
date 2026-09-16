import { describe, expect, it } from "vitest";

import {
  buildExportDocument,
  describePeriod,
  type Cell,
  type ExportDocument,
  type ExportInput,
} from "@/features/export/domain/export-document";
import type { ExportRequest } from "@/features/export/domain/export-request";
import type { FuelEntry } from "@/features/fuel/domain/fuel-entry";
import type { ServiceRecord } from "@/features/service/domain/service-record";
import type { OdometerPoint } from "@/features/stats/domain/monthly-stats";
import { isoDate } from "@/lib/date";
import { decimal2FromNumber } from "@/lib/units";

const d = decimal2FromNumber;
const TODAY = isoDate("2026-09-16");

const fuel: FuelEntry[] = [
  {
    id: "f2",
    filledAt: isoDate("2026-08-20"),
    volumeLiters: d(40),
    pricePerLiter: d(60),
    totalCost: d(2400),
    note: "WOG",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "f1",
    filledAt: isoDate("2026-07-09"),
    volumeLiters: d(50),
    pricePerLiter: d(58),
    totalCost: d(2900),
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const service: ServiceRecord[] = [
  {
    id: "s1",
    performedAt: isoDate("2026-08-18"),
    odometerKm: 156700,
    vendor: "Шиномонтаж №1",
    note: null,
    totalCost: d(1980),
    items: [
      {
        name: "Балансування",
        quantity: d(4),
        unitPrice: d(220),
        amount: d(880),
        kind: "labour",
      },
      {
        name: "Клапан",
        quantity: d(4),
        unitPrice: d(275),
        amount: d(1100),
        kind: "part",
      },
    ],
  },
];

/**
 * Показання охоплюють липень і серпень: разом 3000 км, і саме в ці місяці
 * лягли всі записи вище.
 */
const readings: OdometerPoint[] = [
  { recordedAt: isoDate("2026-06-30"), odometerKm: 150000 },
  { recordedAt: isoDate("2026-07-31"), odometerKm: 151500 },
  { recordedAt: isoDate("2026-08-31"), odometerKm: 153000 },
];

const request = (overrides: Partial<ExportRequest> = {}): ExportRequest => ({
  period: "quarter",
  sections: ["fuel", "service"],
  totals: ["money"],
  format: "xlsx",
  ...overrides,
});

const input = (overrides: Partial<ExportInput> = {}): ExportInput => ({
  car: { name: "Октавія", makeModel: "Skoda Octavia A7", plate: "AA1234BB" },
  request: request(),
  range: { from: isoDate("2026-07-01"), to: isoDate("2026-09-30") },
  fuel,
  service,
  readings,
  today: TODAY,
  ...overrides,
});

const tableNames = (document: ExportDocument) =>
  document.tables.map((table) => table.name);

const summary = (document: ExportDocument) =>
  Object.fromEntries(
    document.summary.map((row) => [row.label, valueOf(row.value)]),
  );

function valueOf(cell: Cell): string | number | null {
  return cell.kind === "date" ? cell.value : cell.value;
}

describe("розділи", () => {
  it("кладе у файл лише вибране", () => {
    expect(tableNames(buildExportDocument(input()))).toEqual([
      "Заправки",
      "ТО",
    ]);

    expect(
      tableNames(
        buildExportDocument(
          input({ request: request({ sections: ["fuel"] }) }),
        ),
      ),
    ).toEqual(["Заправки"]);
  });

  it("позиції додає лише разом із записами ТО", () => {
    expect(
      tableNames(
        buildExportDocument(
          input({ request: request({ sections: ["service", "items"] }) }),
        ),
      ),
    ).toEqual(["ТО", "Позиції ТО"]);

    // Самі позиції без записів — не розділ, а непорозуміння: форма такого не
    // дає, але запит приходить із мережі, і покластись на форму не можна.
    expect(
      tableNames(
        buildExportDocument(
          input({ request: request({ sections: ["items"] }) }),
        ),
      ),
    ).toEqual([]);
  });

  it("розгортає позиції рядками", () => {
    const document = buildExportDocument(
      input({ request: request({ sections: ["service", "items"] }) }),
    );
    const items = document.tables.find((table) => table.name === "Позиції ТО");

    expect(items?.rows).toHaveLength(2);
    expect(items?.rows[0]?.map(valueOf)).toEqual([
      "2026-08-18",
      "Шиномонтаж №1",
      "Балансування",
      "Робота",
      4,
      220,
      880,
    ]);
  });

  it("впорядковує рядки від найранішого", () => {
    // Репозиторій віддає найновіше згори — для стрічки на екрані. Звіт
    // читають навпаки, згори вниз за часом.
    const document = buildExportDocument(input());
    const dates = document.tables[0]?.rows.map((row) => valueOf(row[0]!));

    expect(dates).toEqual(["2026-07-09", "2026-08-20"]);
  });
});

describe("підсумки", () => {
  it("рахують те, що потрапило у файл", () => {
    // Заправки вимкнені — отже, і в «разом» їх немає. Інакше документ
    // суперечив би сам собі: сума рядків не збігалася б із підсумком.
    const document = buildExportDocument(
      input({ request: request({ sections: ["service"] }) }),
    );

    expect(summary(document)).toEqual({
      "Разом, ₴": 1980,
      "Пальне, ₴": 0,
      "ТО, ₴": 1980,
    });
  });

  it("додають рядки лише за вибраними групами", () => {
    const document = buildExportDocument(
      input({ request: request({ totals: ["fuel", "service"] }) }),
    );

    expect(summary(document)).toEqual({
      "Залито, л": 90,
      // 5300 ₴ за 90 л
      "Середня ціна, ₴/л": 58.89,
      Заправок: 2,
      "Записів ТО": 1,
      "Запчастини, ₴": 1100,
      "Робота, ₴": 880,
    });
  });

  it("ділять на пробіг обидві ціни кілометра", () => {
    const document = buildExportDocument(
      input({ request: request({ totals: ["distance", "perKm"] }) }),
    );

    expect(summary(document)).toEqual({
      "Пробіг, км": 3000,
      // 90 л на 3000 км
      "Витрата, л/100 км": 3,
      // 5300 ₴ пального
      "Кілометр на пальному, ₴": 1.77,
      // разом із ТО — 7280 ₴
      "Кілометр разом із ТО, ₴": 2.43,
    });
  });

  it("не ділить на кілометри, яких не міряли", () => {
    // ТО у вересні, а останнє показання одометра — за серпень. Вересневі
    // гроші не мають на що ділитись, тож у ціну кілометра не входять — рівно
    // так само, як на сторінці статистики. Інакше файл показував би одне
    // число, а застосунок інше.
    const document = buildExportDocument(
      input({
        request: request({ totals: ["distance", "perKm"] }),
        service: [
          ...service,
          {
            id: "s2",
            performedAt: isoDate("2026-09-10"),
            odometerKm: null,
            vendor: null,
            note: null,
            totalCost: d(5000),
            items: [],
          },
        ],
      }),
    );

    expect(summary(document)).toEqual({
      "Пробіг, км": 3000,
      "Витрата, л/100 км": 3,
      "Кілометр на пальному, ₴": 1.77,
      // Ті самі 7280 ₴, що й без вересневого запису.
      "Кілометр разом із ТО, ₴": 2.43,
    });
  });

  it("без пробігу лишають порожнє, а не нуль", () => {
    const document = buildExportDocument(
      input({
        request: request({ totals: ["distance", "perKm"] }),
        readings: [],
      }),
    );

    expect(summary(document)).toEqual({
      "Пробіг, км": null,
      "Витрата, л/100 км": null,
      "Кілометр на пальному, ₴": null,
      "Кілометр разом із ТО, ₴": null,
    });
  });

  it("без жодної групи лишаються самі таблиці", () => {
    const document = buildExportDocument(
      input({ request: request({ totals: [] }) }),
    );

    expect(document.summary).toEqual([]);
  });
});

describe("шапка", () => {
  it("називає авто й проміжок", () => {
    const document = buildExportDocument(input());

    expect(document.title).toBe("Октавія");
    expect(document.caption).toBe("Skoda Octavia A7 · AA1234BB");
    expect(document.period).toBe("01.07.2026 — 30.09.2026");
  });

  it("не лишає порожніх роздільників, коли поля не заповнені", () => {
    const document = buildExportDocument(
      input({ car: { name: "Ланос", makeModel: null, plate: null } }),
    );

    expect(document.caption).toBe("");
  });

  it("називає файл латиницею й із датою", () => {
    // Кирилиця в імені файлу дорогою перетворюється на відсотки, а дата
    // потрібна, щоб два вивантаження не перезаписали одне одного.
    expect(buildExportDocument(input()).baseName).toBe(
      "avto-vytraty-2026-09-16",
    );
  });

  it("увесь час — це не проміжок", () => {
    expect(describePeriod(null)).toBe("Увесь час");
  });
});
