import { beforeEach, describe, expect, it, vi } from "vitest";

import { isoDate, monthKey } from "@/lib/date";

const sendOdometerReminder = vi.fn();
const getLatestReadingMonth = vi.fn();
const getExportStatus = vi.fn();
const exportPeriod = vi.fn();

vi.mock("@/features/notifications/services/notifications.service", () => ({
  sendOdometerReminder: (...args: unknown[]) => sendOdometerReminder(...args),
}));

vi.mock("@/features/odometer/services/odometer-readings.service", () => ({
  getLatestReadingMonth: () => getLatestReadingMonth(),
}));

vi.mock("@/features/sheets-export/services/sheets-export.service", () => ({
  getExportStatus: () => getExportStatus(),
  exportPeriod: (...args: unknown[]) => exportPeriod(...args),
}));

const { runDailyJobs } =
  await import("@/features/cron/services/daily-dispatcher");

const delivered = { sent: 1, removed: 0, failed: 0 };

/** 31 серпня — останній день місяця. */
const LAST_DAY = isoDate("2026-08-31");
const MID_MONTH = isoDate("2026-08-15");
const AUGUST = monthKey("2026-08");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  getLatestReadingMonth.mockResolvedValue(null);
  sendOdometerReminder.mockResolvedValue(delivered);
  getExportStatus.mockResolvedValue({
    configured: true,
    pending: [],
    tabName: "Пальне",
  });
});

describe("нагадування про пробіг", () => {
  it("не шлеться серед місяця", async () => {
    const report = await runDailyJobs(MID_MONTH);

    expect(report.reminder).toEqual({
      status: "skipped",
      reason: "not-last-day",
      month: AUGUST,
    });
    expect(sendOdometerReminder).not.toHaveBeenCalled();
    // Показання навіть не читаємо: до бази ходити нема за чим.
    expect(getLatestReadingMonth).not.toHaveBeenCalled();
  });

  it("шлеться в останній день місяця", async () => {
    const report = await runDailyJobs(LAST_DAY);

    expect(report.reminder).toEqual({
      status: "sent",
      month: AUGUST,
      delivery: delivered,
    });
    expect(sendOdometerReminder).toHaveBeenCalledWith(AUGUST);
  });

  it("не шлеться, якщо пробіг за цей місяць уже внесли", async () => {
    getLatestReadingMonth.mockResolvedValue(AUGUST);

    const report = await runDailyJobs(LAST_DAY);

    expect(report.reminder).toEqual({
      status: "skipped",
      reason: "already-recorded",
      month: AUGUST,
    });
    expect(sendOdometerReminder).not.toHaveBeenCalled();
  });

  it("шлеться, якщо останнє показання — за минулий місяць", async () => {
    getLatestReadingMonth.mockResolvedValue(monthKey("2026-07"));

    expect((await runDailyJobs(LAST_DAY)).reminder.status).toBe("sent");
  });

  it("правильно бере останній день коротких місяців", async () => {
    // Лютий 2026 — не високосний, тож 28-е і є останнім.
    expect((await runDailyJobs(isoDate("2026-02-28"))).reminder.status).toBe(
      "sent",
    );
    // А 2028-й високосний: 28 лютого там ще не кінець.
    expect((await runDailyJobs(isoDate("2028-02-28"))).reminder.status).toBe(
      "skipped",
    );
    expect((await runDailyJobs(isoDate("2028-02-29"))).reminder.status).toBe(
      "sent",
    );
  });

  it("збій розсилки не зриває вивантаження", async () => {
    sendOdometerReminder.mockRejectedValue(new Error("push-сервіс лежить"));
    getExportStatus.mockResolvedValue({
      configured: true,
      pending: [monthKey("2026-07")],
      tabName: "Пальне",
    });
    exportPeriod.mockResolvedValue({ status: "exported" });

    const report = await runDailyJobs(LAST_DAY);

    expect(report.reminder).toMatchObject({ status: "failed" });
    expect(report.exports).toEqual([
      { status: "exported", period: monthKey("2026-07") },
    ]);
    expect(report.ok).toBe(false);
  });
});

describe("вивантаження в таблицю", () => {
  it("без доступів до Google не робиться нічого", async () => {
    getExportStatus.mockResolvedValue({
      configured: false,
      pending: [],
      tabName: "Пальне",
    });

    const report = await runDailyJobs(MID_MONTH);

    expect(report.exports).toEqual([]);
    expect(exportPeriod).not.toHaveBeenCalled();
    expect(report.ok).toBe(true);
  });

  it("вивантажує всі закриті місяці, а не лише попередній", async () => {
    // Саме тут видно різницю з «першого числа вивантажуємо попередній»:
    // пропущені раніше місяці добираються наступним же запуском.
    getExportStatus.mockResolvedValue({
      configured: true,
      pending: [monthKey("2026-06"), monthKey("2026-07")],
      tabName: "Пальне",
    });
    exportPeriod.mockResolvedValue({ status: "exported" });

    const report = await runDailyJobs(MID_MONTH);

    expect(exportPeriod).toHaveBeenNthCalledWith(1, monthKey("2026-06"));
    expect(exportPeriod).toHaveBeenNthCalledWith(2, monthKey("2026-07"));
    expect(report.exports).toHaveLength(2);
    expect(report.ok).toBe(true);
  });

  it("збій на одному місяці не ховає решту", async () => {
    getExportStatus.mockResolvedValue({
      configured: true,
      pending: [monthKey("2026-06"), monthKey("2026-07")],
      tabName: "Пальне",
    });
    exportPeriod.mockImplementation((period: string) =>
      period === "2026-06"
        ? Promise.reject(new Error("немає доступу"))
        : Promise.resolve({ status: "exported" }),
    );

    const report = await runDailyJobs(MID_MONTH);

    expect(report.exports).toEqual([
      {
        status: "failed",
        period: monthKey("2026-06"),
        error: "немає доступу",
      },
      { status: "exported", period: monthKey("2026-07") },
    ]);
    expect(report.ok).toBe(false);
  });

  it("уже вивантажений місяць не рахується збоєм", async () => {
    getExportStatus.mockResolvedValue({
      configured: true,
      pending: [monthKey("2026-07")],
      tabName: "Пальне",
    });
    exportPeriod.mockResolvedValue({ status: "already-exported" });

    const report = await runDailyJobs(MID_MONTH);

    expect(report.exports).toEqual([
      { status: "already-exported", period: monthKey("2026-07") },
    ]);
    expect(report.ok).toBe(true);
  });
});

describe("звіт", () => {
  it("повертає дату, за яку відпрацював", async () => {
    expect((await runDailyJobs(MID_MONTH)).date).toBe(MID_MONTH);
  });

  it("спокійний день — усе зелене", async () => {
    const report = await runDailyJobs(MID_MONTH);

    expect(report).toEqual({
      date: MID_MONTH,
      reminder: {
        status: "skipped",
        reason: "not-last-day",
        month: AUGUST,
      },
      exports: [],
      ok: true,
    });
  });
});
