import { beforeEach, describe, expect, it, vi } from "vitest";

import { isoDate, monthKey } from "@/lib/date";

const sendOdometerReminder = vi.fn();
const getLatestReadingMonth = vi.fn();

vi.mock("@/features/notifications/services/notifications.service", () => ({
  sendOdometerReminder: (...args: unknown[]) => sendOdometerReminder(...args),
}));

vi.mock("@/features/odometer/services/odometer-readings.service", () => ({
  getLatestReadingMonth: () => getLatestReadingMonth(),
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
});

describe("звіт", () => {
  it("повертає дату, за яку відпрацював", async () => {
    expect((await runDailyJobs(MID_MONTH)).date).toBe(MID_MONTH);
  });

  it("спокійний день — усе зелене", async () => {
    expect(await runDailyJobs(MID_MONTH)).toEqual({
      date: MID_MONTH,
      reminder: {
        status: "skipped",
        reason: "not-last-day",
        month: AUGUST,
      },
      ok: true,
    });
  });

  it("збій розсилки видно у звіті", async () => {
    sendOdometerReminder.mockRejectedValue(new Error("push-сервіс лежить"));

    const report = await runDailyJobs(LAST_DAY);

    expect(report.reminder).toMatchObject({
      status: "failed",
      error: "push-сервіс лежить",
    });
    expect(report.ok).toBe(false);
  });
});
