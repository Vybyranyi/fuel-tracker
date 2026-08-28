import { describe, expect, it } from "vitest";

import {
  averagePricePerLiter,
  buildMonthlyStats,
  consumptionPer100Km,
  costPerKm,
  distanceByMonth,
  percentChange,
  totalsOf,
  type MonthlyAggregateRow,
  type OdometerPoint,
} from "@/features/stats/domain/monthly-stats";
import { isoDate } from "@/lib/date";
import { decimal2FromNumber, decimal2ToNumber } from "@/lib/units";

const d = decimal2FromNumber;
const n = (value: unknown) =>
  value === null ? null : decimal2ToNumber(value as never);

const reading = (date: string, km: number): OdometerPoint => ({
  recordedAt: isoDate(date),
  odometerKm: km,
});

describe("averagePricePerLiter", () => {
  it("ділить гроші на літри, а не усереднює ціни заправок", () => {
    // 20 л по 50 і 5 л по 70: середнє цін дало б 60, але заплачено 1350 за
    // 25 л — тобто 54. Мала дозаправка не має тягнути середню вгору.
    expect(n(averagePricePerLiter(d(1350), d(25)))).toBe(54);
  });

  it("без літрів середньої немає", () => {
    expect(averagePricePerLiter(d(0), d(0))).toBeNull();
  });
});

describe("consumptionPer100Km", () => {
  it("рахує літри на сотню", () => {
    // 120 л на 1500 км → 8 л/100 км.
    expect(n(consumptionPer100Km(d(120), 1500))).toBe(8);
  });

  it("не втрачає точність на коротких пробігах", () => {
    // Множення на 100 має відбутись до ділення, інакше результат ляже в нуль.
    expect(n(consumptionPer100Km(d(4.5), 60))).toBe(7.5);
  });

  it("без пробігу витрати не буває", () => {
    expect(consumptionPer100Km(d(120), null)).toBeNull();
    expect(consumptionPer100Km(d(120), 0)).toBeNull();
  });
});

describe("costPerKm", () => {
  it("рахує вартість кілометра", () => {
    expect(n(costPerKm(d(7500), 1500))).toBe(5);
  });
});

describe("distanceByMonth", () => {
  it("бере різницю з останнім показанням попереднього місяця", () => {
    const distances = distanceByMonth([
      reading("2026-06-30", 150000),
      reading("2026-07-31", 151500),
      reading("2026-08-31", 153000),
    ]);

    expect(distances.get("2026-07" as never)).toBe(1500);
    expect(distances.get("2026-08" as never)).toBe(1500);
  });

  it("для першого місяця порівнювати нема з чим", () => {
    // Рахувати від нуля означало б показати пробіг 150 000 км за місяць.
    const distances = distanceByMonth([
      reading("2026-06-30", 150000),
      reading("2026-07-31", 151500),
    ]);

    expect(distances.has("2026-06" as never)).toBe(false);
  });

  it("бере останнє показання місяця, якщо їх кілька", () => {
    const distances = distanceByMonth([
      reading("2026-06-30", 150000),
      reading("2026-07-10", 150800),
      reading("2026-07-31", 151500),
    ]);

    expect(distances.get("2026-07" as never)).toBe(1500);
  });

  it("переживає невпорядкований ввід", () => {
    const distances = distanceByMonth([
      reading("2026-08-31", 153000),
      reading("2026-06-30", 150000),
      reading("2026-07-31", 151500),
    ]);

    expect(distances.get("2026-08" as never)).toBe(1500);
  });

  it("пропускає місяці через прогалину", () => {
    // Показань за липень немає: серпневий пробіг рахується від червневого.
    const distances = distanceByMonth([
      reading("2026-06-30", 150000),
      reading("2026-08-31", 153000),
    ]);

    expect(distances.get("2026-08" as never)).toBe(3000);
    expect(distances.has("2026-07" as never)).toBe(false);
  });
});

describe("buildMonthlyStats", () => {
  const rows: MonthlyAggregateRow[] = [
    { period: "2026-08", liters: "120.00", totalCost: "6960.00", fillCount: 3 },
    { period: "2026-07", liters: "100.00", totalCost: "5700.00", fillCount: 2 },
  ];

  const readings = [
    reading("2026-06-30", 150000),
    reading("2026-07-31", 151500),
    reading("2026-08-31", 153000),
  ];

  it("впорядковує місяці від найранішого — саме так їх чекає вісь часу", () => {
    expect(buildMonthlyStats(rows, readings).map((m) => m.month)).toEqual([
      "2026-07",
      "2026-08",
    ]);
  });

  it("зводить суми, середню ціну й витрату", () => {
    const [july, august] = buildMonthlyStats(rows, readings);

    expect(n(july.liters)).toBe(100);
    expect(n(july.averagePricePerLiter)).toBe(57);
    expect(july.distanceKm).toBe(1500);
    // 100 л на 1500 км
    expect(n(july.consumptionPer100Km)).toBe(6.67);

    expect(n(august.totalCost)).toBe(6960);
    expect(n(august.averagePricePerLiter)).toBe(58);
    expect(n(august.consumptionPer100Km)).toBe(8);
  });

  it("без показань одометра лишає витрату порожньою, а не нульовою", () => {
    const [july] = buildMonthlyStats(rows, []);
    expect(july.distanceKm).toBeNull();
    expect(july.consumptionPer100Km).toBeNull();
  });
});

describe("totalsOf", () => {
  const months = buildMonthlyStats(
    [
      {
        period: "2026-07",
        liters: "100.00",
        totalCost: "5700.00",
        fillCount: 2,
      },
      {
        period: "2026-08",
        liters: "120.00",
        totalCost: "6960.00",
        fillCount: 3,
      },
    ],
    [
      reading("2026-06-30", 150000),
      reading("2026-07-31", 151500),
      reading("2026-08-31", 153000),
    ],
  );

  it("сумує літри, гроші й заправки", () => {
    const totals = totalsOf(months);
    expect(n(totals.liters)).toBe(220);
    expect(n(totals.totalCost)).toBe(12660);
    expect(totals.fillCount).toBe(5);
  });

  it("рахує підсумкову витрату лише по місяцях із відомим пробігом", () => {
    // Місяць без показань не має занижувати витрату — він просто не бере
    // участі, замість того щоб додати літри без кілометрів.
    const withGap = buildMonthlyStats(
      [
        {
          period: "2026-07",
          liters: "100.00",
          totalCost: "5700.00",
          fillCount: 2,
        },
        {
          period: "2026-09",
          liters: "999.00",
          totalCost: "9999.00",
          fillCount: 1,
        },
      ],
      [reading("2026-06-30", 150000), reading("2026-07-31", 151500)],
    );

    const totals = totalsOf(withGap);
    expect(totals.distanceKm).toBe(1500);
    // Рахується лише липень: 100 л на 1500 км.
    expect(n(totals.consumptionPer100Km)).toBe(6.67);
    // А от літри й гроші в підсумку — за весь час.
    expect(n(totals.liters)).toBe(1099);
  });

  it("без жодного показання пробіг і витрата порожні", () => {
    const totals = totalsOf(buildMonthlyStats([], []));
    expect(totals.distanceKm).toBeNull();
    expect(totals.consumptionPer100Km).toBeNull();
    expect(totals.costPerKm).toBeNull();
  });
});

describe("percentChange", () => {
  it("рахує зростання і спад", () => {
    expect(percentChange(d(120), d(100))).toBeCloseTo(20);
    expect(percentChange(d(80), d(100))).toBeCloseTo(-20);
    expect(percentChange(d(100), d(100))).toBe(0);
  });

  it("мовчить, коли порівнювати нема з чим", () => {
    expect(percentChange(d(100), null)).toBeNull();
    expect(percentChange(null, d(100))).toBeNull();
    // Нуль у знаменнику: «зросло у нескінченність» не показуємо.
    expect(percentChange(d(100), d(0))).toBeNull();
  });
});
