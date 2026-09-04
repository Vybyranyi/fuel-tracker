import { beforeEach, describe, expect, it, vi } from "vitest";

import { isoDate, monthKey } from "@/lib/date";

const sendOdometerReminder = vi.fn();
const listPendingReminders = vi.fn();

vi.mock("@/features/notifications/services/notifications.service", () => ({
  sendOdometerReminder: (...args: unknown[]) => sendOdometerReminder(...args),
}));

vi.mock("@/features/cron/repository/reminders.repository", () => ({
  listPendingReminders: (...args: unknown[]) => listPendingReminders(...args),
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
  listPendingReminders.mockResolvedValue([]);
  sendOdometerReminder.mockResolvedValue(delivered);
});

describe("нагадування про пробіг", () => {
  it("серед місяця не шлеться й до бази не ходить", async () => {
    const report = await runDailyJobs(MID_MONTH);

    expect(report).toEqual({
      date: MID_MONTH,
      month: AUGUST,
      reminders: null,
      ok: true,
    });
    expect(listPendingReminders).not.toHaveBeenCalled();
    expect(sendOdometerReminder).not.toHaveBeenCalled();
  });

  it("в останній день шле кожному, кого повернув запит", async () => {
    listPendingReminders.mockResolvedValue([
      { userId: "u1", carNames: ["Октавія"] },
      { userId: "u2", carNames: ["Ланос", "Пріус"] },
    ]);

    const report = await runDailyJobs(LAST_DAY);

    expect(listPendingReminders).toHaveBeenCalledWith(AUGUST);
    expect(sendOdometerReminder).toHaveBeenNthCalledWith(1, "u1", AUGUST, [
      "Октавія",
    ]);
    expect(sendOdometerReminder).toHaveBeenNthCalledWith(2, "u2", AUGUST, [
      "Ланос",
      "Пріус",
    ]);
    expect(report.ok).toBe(true);
    expect(report.reminders).toHaveLength(2);
  });

  it("нікому не шле, якщо показання за місяць уже всюди внесені", async () => {
    const report = await runDailyJobs(LAST_DAY);

    expect(sendOdometerReminder).not.toHaveBeenCalled();
    expect(report.reminders).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("збій в одного не ховає решту", async () => {
    listPendingReminders.mockResolvedValue([
      { userId: "u1", carNames: ["Октавія"] },
      { userId: "u2", carNames: ["Ланос"] },
    ]);
    sendOdometerReminder.mockImplementation((userId: string) =>
      userId === "u1"
        ? Promise.reject(new Error("push-сервіс лежить"))
        : Promise.resolve(delivered),
    );

    const report = await runDailyJobs(LAST_DAY);

    expect(report.reminders).toEqual([
      { status: "failed", userId: "u1", error: "push-сервіс лежить" },
      { status: "sent", userId: "u2", delivery: delivered },
    ]);
    expect(report.ok).toBe(false);
  });

  it("правильно бере останній день коротких місяців", async () => {
    // Лютий 2026 — не високосний, тож 28-е і є останнім.
    expect(
      (await runDailyJobs(isoDate("2026-02-28"))).reminders,
    ).not.toBeNull();
    // А 2028-й високосний: 28 лютого там ще не кінець.
    expect((await runDailyJobs(isoDate("2028-02-28"))).reminders).toBeNull();
    expect(
      (await runDailyJobs(isoDate("2028-02-29"))).reminders,
    ).not.toBeNull();
  });
});
