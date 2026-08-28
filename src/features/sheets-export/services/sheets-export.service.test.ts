import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SheetsGateway } from "@/features/sheets-export/services/google-sheets.gateway";
import {
  buildMonthlyStats,
  totalsOf,
  type MonthlyAggregateRow,
} from "@/features/stats/domain/monthly-stats";
import { monthKey } from "@/lib/date";
import { UserFacingError } from "@/lib/safe-action";

const claimPeriod = vi.fn();
const releasePeriod = vi.fn();
const listExportedPeriods = vi.fn();
const getStatsOverview = vi.fn();
let configured = true;

vi.mock(
  "@/features/sheets-export/repository/monthly-exports.repository",
  () => ({
    claimPeriod: (...args: unknown[]) => claimPeriod(...args),
    releasePeriod: (...args: unknown[]) => releasePeriod(...args),
    listExportedPeriods: () => listExportedPeriods(),
  }),
);

vi.mock("@/features/stats/services/stats.service", () => ({
  getStatsOverview: () => getStatsOverview(),
}));

vi.mock("@/features/sheets-export/services/google-sheets.gateway", () => ({
  // Справжній шлюз читає оточення й ходить у мережу. Якщо він тут викличеться,
  // це означає, що сервіс не взяв переданий підставний — і тест має впасти.
  createSheetsGateway: () => {
    throw new Error("createSheetsGateway не має викликатись у тесті");
  },
  isSheetsConfigured: () => configured,
  sheetsTabName: () => "Пальне",
}));

const { exportPeriod, getExportStatus } =
  await import("@/features/sheets-export/services/sheets-export.service");

const AUGUST = monthKey("2026-08");

const row = (period: string): MonthlyAggregateRow => ({
  period,
  liters: "117.80",
  totalCost: "6994.17",
  fillCount: 4,
});

function overviewWith(periods: string[]) {
  const months = buildMonthlyStats(periods.map(row), []);
  return {
    months,
    totals: totalsOf(months),
    current: months.at(-1) ?? null,
    previous: months.at(-2) ?? null,
  };
}

/** Шлюз, який усе записує й нічого не робить. */
function fakeGateway(overrides: Partial<SheetsGateway> = {}) {
  const calls: string[] = [];
  const gateway: SheetsGateway = {
    listSheetTitles: () => {
      calls.push("listSheetTitles");
      return Promise.resolve(["Пальне"]);
    },
    createSheet: (title) => {
      calls.push(`createSheet:${title}`);
      return Promise.resolve();
    },
    readHeader: () => {
      calls.push("readHeader");
      return Promise.resolve(["Місяць"]);
    },
    writeHeader: (title) => {
      calls.push(`writeHeader:${title}`);
      return Promise.resolve();
    },
    appendRow: (title) => {
      calls.push(`appendRow:${title}`);
      return Promise.resolve();
    },
    ...overrides,
  };

  return { gateway, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Сервіс логує причину збою — у виводі тестів це був би шум.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  configured = true;
  claimPeriod.mockResolvedValue(true);
  getStatsOverview.mockResolvedValue(overviewWith(["2026-08"]));
  listExportedPeriods.mockResolvedValue([]);
  // Дата потрібна тільки для «поточного місяця» в getExportStatus.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-15T09:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("exportPeriod", () => {
  it("без заправок за місяць не чіпає ні базу, ні таблицю", async () => {
    getStatsOverview.mockResolvedValue(overviewWith([]));
    const { gateway, calls } = fakeGateway();

    expect(await exportPeriod(AUGUST, gateway)).toEqual({
      status: "no-data",
      period: AUGUST,
    });
    expect(claimPeriod).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("уже вивантажений місяць не дописується вдруге", async () => {
    claimPeriod.mockResolvedValue(false);
    const { gateway, calls } = fakeGateway();

    expect(await exportPeriod(AUGUST, gateway)).toEqual({
      status: "already-exported",
      period: AUGUST,
    });
    // Найважливіше в цьому тесті: до Google справа не дійшла.
    expect(calls).toEqual([]);
    expect(releasePeriod).not.toHaveBeenCalled();
  });

  it("займає місяць до звернення до Google, а не після", async () => {
    const order: string[] = [];
    claimPeriod.mockImplementation(() => {
      order.push("claim");
      return Promise.resolve(true);
    });
    const { gateway } = fakeGateway({
      appendRow: () => {
        order.push("append");
        return Promise.resolve();
      },
    });

    await exportPeriod(AUGUST, gateway);

    expect(order).toEqual(["claim", "append"]);
  });

  it("створює аркуш із шапкою, якщо його немає", async () => {
    const { gateway, calls } = fakeGateway({
      listSheetTitles: () => Promise.resolve(["Витрати", "Сервіс"]),
    });

    const result = await exportPeriod(AUGUST, gateway);

    expect(result.status).toBe("exported");
    expect(calls).toEqual([
      "createSheet:Пальне",
      "writeHeader:Пальне",
      "appendRow:Пальне",
    ]);
  });

  it("не переписує шапку в аркуші, де вона вже є", async () => {
    const { gateway, calls } = fakeGateway();

    await exportPeriod(AUGUST, gateway);

    expect(calls).toEqual([
      "listSheetTitles",
      "readHeader",
      "appendRow:Пальне",
    ]);
  });

  it("дописує шапку в порожній аркуш, заведений руками", async () => {
    const { gateway, calls } = fakeGateway({
      readHeader: () => Promise.resolve([]),
    });

    await exportPeriod(AUGUST, gateway);

    expect(calls).toContain("writeHeader:Пальне");
    expect(calls).not.toContain("createSheet:Пальне");
  });

  it("у таблицю йде рівно той рядок, який записано в базу", async () => {
    let appended: unknown;
    const { gateway } = fakeGateway({
      appendRow: (_title, value) => {
        appended = value;
        return Promise.resolve();
      },
    });

    const result = await exportPeriod(AUGUST, gateway);

    expect(appended).toEqual(claimPeriod.mock.calls[0]?.[1]);
    expect(result).toMatchObject({ status: "exported", row: appended });
  });

  it("звільняє місяць, якщо запис у таблицю впав", async () => {
    const { gateway } = fakeGateway({
      appendRow: () => Promise.reject(new Error("Google недоступний")),
    });

    // Назовні йде зрозуміла підказка, а не текст від Google.
    await expect(exportPeriod(AUGUST, gateway)).rejects.toBeInstanceOf(
      UserFacingError,
    );
    // Без цього місяць лишився б «вивантаженим», а рядка в таблиці не було б.
    expect(releasePeriod).toHaveBeenCalledWith(AUGUST);
  });

  it("збій бази не видає себе за проблему з доступом до таблиці", async () => {
    // Порада «перевір доступ сервісному акаунту» доречна лише для Google.
    // Якщо ляже Postgres, вона відправила б шукати проблему не туди.
    getStatsOverview.mockRejectedValue(new Error("база недоступна"));
    const { gateway } = fakeGateway();

    await expect(exportPeriod(AUGUST, gateway)).rejects.not.toBeInstanceOf(
      UserFacingError,
    );
  });

  it("звільняє місяць і тоді, коли впало ще на підготовці аркуша", async () => {
    const { gateway } = fakeGateway({
      listSheetTitles: () => Promise.reject(new Error("немає доступу")),
    });

    await expect(exportPeriod(AUGUST, gateway)).rejects.toBeInstanceOf(
      UserFacingError,
    );
    expect(releasePeriod).toHaveBeenCalledWith(AUGUST);
  });
});

describe("getExportStatus", () => {
  it("без налаштувань нічого не пропонує", async () => {
    configured = false;

    expect(await getExportStatus()).toEqual({
      configured: false,
      pending: [],
      tabName: "Пальне",
    });
    expect(getStatsOverview).not.toHaveBeenCalled();
  });

  it("пропонує місяці, яких ще немає в таблиці", async () => {
    getStatsOverview.mockResolvedValue(
      overviewWith(["2026-06", "2026-07", "2026-08"]),
    );
    listExportedPeriods.mockResolvedValue([monthKey("2026-06")]);

    expect((await getExportStatus()).pending).toEqual([
      monthKey("2026-07"),
      monthKey("2026-08"),
    ]);
  });

  it("не пропонує поточний місяць — він ще не закінчився", async () => {
    getStatsOverview.mockResolvedValue(overviewWith(["2026-08", "2026-09"]));

    expect((await getExportStatus()).pending).toEqual([monthKey("2026-08")]);
  });
});
