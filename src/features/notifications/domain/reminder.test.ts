import { describe, expect, it } from "vitest";

import {
  odometerReminder,
  testNotification,
} from "@/features/notifications/domain/reminder";
import { monthKey } from "@/lib/date";

describe("odometerReminder", () => {
  it("називає місяць з малої літери", () => {
    expect(odometerReminder(monthKey("2026-08")).title).toBe(
      "Пробіг за серпень 2026",
    );
    expect(odometerReminder(monthKey("2026-01")).title).toBe(
      "Пробіг за січень 2026",
    );
  });

  it("веде на сторінку пробігу", () => {
    expect(odometerReminder(monthKey("2026-08")).url).toBe("/odometer");
  });

  it("має спільний тег, щоб нове нагадування витісняло старе", () => {
    expect(odometerReminder(monthKey("2026-07")).tag).toBe(
      odometerReminder(monthKey("2026-08")).tag,
    );
  });

  it("тестове сповіщення не плутається з нагадуванням", () => {
    expect(testNotification().tag).not.toBe(
      odometerReminder(monthKey("2026-08")).tag,
    );
  });
});
