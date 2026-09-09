import { describe, expect, it } from "vitest";

import {
  matchesQuery,
  mergeCosts,
  resolvePeriod,
  totalOfCosts,
} from "@/features/costs/domain/cost-entry";
import type { FuelEntry } from "@/features/fuel/domain/fuel-entry";
import type { ServiceRecord } from "@/features/service/domain/service-record";
import { isoDate } from "@/lib/date";
import { decimal2FromNumber, decimal2ToNumber } from "@/lib/units";

const money = decimal2FromNumber;

const fuel = (
  id: string,
  date: string,
  note: string | null = null,
): FuelEntry => ({
  id,
  filledAt: isoDate(date),
  volumeLiters: money(40),
  pricePerLiter: money(58),
  totalCost: money(2320),
  note,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const service = (
  id: string,
  date: string,
  overrides: Partial<ServiceRecord> = {},
): ServiceRecord => ({
  id,
  performedAt: isoDate(date),
  odometerKm: null,
  vendor: null,
  note: null,
  totalCost: money(1000),
  items: [],
  ...overrides,
});

describe("mergeCosts", () => {
  it("зводить обидва потоки найновішим догори", () => {
    const merged = mergeCosts(
      [fuel("f1", "2026-08-10"), fuel("f2", "2026-09-01")],
      [service("s1", "2026-08-20")],
    );

    expect(merged.map((entry) => entry.id)).toEqual(["f2", "s1", "f1"]);
  });

  it("за однакової дати порядок сталий, а не випадковий", () => {
    // Без другого ключа сортування два записи одного дня міняються місцями
    // між заходами, і список «блимає».
    const same = ["2026-08-15", "2026-08-15"] as const;
    const first = mergeCosts([fuel("f1", same[0])], [service("s1", same[1])]);
    const second = mergeCosts([fuel("f1", same[0])], [service("s1", same[1])]);

    expect(first.map((e) => e.id)).toEqual(["f1", "s1"]);
    expect(second.map((e) => e.id)).toEqual(first.map((e) => e.id));
  });

  it("порожні потоки дають порожній список", () => {
    expect(mergeCosts([], [])).toEqual([]);
  });
});

describe("totalOfCosts", () => {
  it("складає суми обох видів", () => {
    const merged = mergeCosts(
      [fuel("f1", "2026-08-10")],
      [service("s1", "2026-08-11")],
    );
    expect(decimal2ToNumber(totalOfCosts(merged))).toBe(3320);
  });

  it("порожній список — нуль", () => {
    expect(decimal2ToNumber(totalOfCosts([]))).toBe(0);
  });
});

describe("resolvePeriod", () => {
  const today = isoDate("2026-09-09");

  it("«увесь час» не ставить меж", () => {
    expect(resolvePeriod("all", today)).toBeNull();
  });

  it("поточний місяць", () => {
    expect(resolvePeriod("month", today)).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("минулий місяць", () => {
    expect(resolvePeriod("previous-month", today)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("три місяці — разом із поточним", () => {
    expect(resolvePeriod("quarter", today)).toEqual({
      from: "2026-07-01",
      to: "2026-09-30",
    });
  });

  it("рік — від січня до грудня", () => {
    expect(resolvePeriod("year", today)).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("переходить через межу року", () => {
    expect(resolvePeriod("previous-month", isoDate("2026-01-15"))).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
    expect(resolvePeriod("quarter", isoDate("2026-02-10"))).toEqual({
      from: "2025-12-01",
      to: "2026-02-28",
    });
  });
});

describe("matchesQuery", () => {
  const entries = mergeCosts(
    [fuel("f1", "2026-08-10", "ОККО на трасі")],
    [
      service("s1", "2026-08-20", {
        vendor: "СТО на Пушкінській",
        items: [
          {
            name: "Олива 5W-30",
            quantity: money(4),
            unitPrice: money(390),
            amount: money(1560),
            kind: "part",
          },
        ],
      }),
    ],
  );

  const find = (query: string) =>
    entries.filter((entry) => matchesQuery(entry, query)).map((e) => e.id);

  it("порожній запит пропускає все", () => {
    expect(find("")).toEqual(["s1", "f1"]);
    expect(find("   ")).toEqual(["s1", "f1"]);
  });

  it("шукає в нотатці заправки", () => {
    expect(find("окко")).toEqual(["f1"]);
  });

  it("шукає в назві СТО і в позиціях", () => {
    expect(find("пушкін")).toEqual(["s1"]);
    expect(find("олива")).toEqual(["s1"]);
  });

  it("не зважає на регістр", () => {
    expect(find("ОЛИВА")).toEqual(["s1"]);
  });

  it("нічого не знаходить — порожньо, а не все", () => {
    expect(find("шиномонтаж")).toEqual([]);
  });

  it("запис без тексту не збігається ні з чим", () => {
    const bare = mergeCosts([fuel("f2", "2026-08-01")], []);
    expect(bare.filter((e) => matchesQuery(e, "щось")).length).toBe(0);
  });
});
