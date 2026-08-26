import { describe, expect, it } from "vitest";

import {
  currentMonthKey,
  daysInMonth,
  isFirstDayOfMonth,
  isLastDayOfMonth,
  isoDate,
  monthKey,
  monthKeyOf,
  monthRange,
  nextMonthKey,
  previousMonthKey,
  todayInKyiv,
} from "@/lib/date";

describe("isoDate", () => {
  it("приймає коректну дату", () => {
    expect(isoDate("2026-08-15")).toBe("2026-08-15");
  });

  it("відхиляє чужий формат", () => {
    for (const value of ["15.08.2026", "2026-8-15", "2026-08", ""]) {
      expect(() => isoDate(value)).toThrow(TypeError);
    }
  });

  it("відхиляє дати, яких не існує", () => {
    // Формат правильний, але 30 лютого немає — регулярка такого не спіймає.
    expect(() => isoDate("2026-02-30")).toThrow(RangeError);
    expect(() => isoDate("2026-13-01")).toThrow(RangeError);
    expect(() => isoDate("2026-04-31")).toThrow(RangeError);
  });

  it("знає про високосний рік", () => {
    expect(isoDate("2028-02-29")).toBe("2028-02-29");
    expect(() => isoDate("2026-02-29")).toThrow(RangeError);
  });
});

describe("monthKey", () => {
  it("відхиляє неіснуючий місяць", () => {
    expect(() => monthKey("2026-13")).toThrow(TypeError);
    expect(() => monthKey("2026-00")).toThrow(TypeError);
    expect(() => monthKey("2026-8")).toThrow(TypeError);
  });
});

describe("київський пояс", () => {
  it("бере дату за Києвом, а не за UTC", () => {
    // 21:30 UTC — у Києві вже 00:30 наступної доби (влітку UTC+3).
    // Саме тут вечірня заправка поїхала б на завтрашню дату.
    expect(todayInKyiv(new Date("2026-08-26T21:30:00Z"))).toBe("2026-08-27");
    expect(todayInKyiv(new Date("2026-08-26T20:30:00Z"))).toBe("2026-08-26");
  });

  it("враховує зимовий час", () => {
    // Взимку Київ UTC+2: та сама 22:30 UTC — це вже наступна доба.
    expect(todayInKyiv(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-16");
    expect(todayInKyiv(new Date("2026-01-15T21:30:00Z"))).toBe("2026-01-15");
  });

  it("перекидає місяць і рік на межі доби", () => {
    expect(todayInKyiv(new Date("2026-12-31T22:00:00Z"))).toBe("2027-01-01");
    expect(currentMonthKey(new Date("2026-12-31T22:00:00Z"))).toBe("2027-01");
  });
});

describe("навігація місяцями", () => {
  it("дістає місяць із дати", () => {
    expect(monthKeyOf(isoDate("2026-08-15"))).toBe("2026-08");
  });

  it("переходить через межу року", () => {
    expect(previousMonthKey(monthKey("2026-01"))).toBe("2025-12");
    expect(nextMonthKey(monthKey("2026-12"))).toBe("2027-01");
  });

  it("переходить усередині року", () => {
    expect(previousMonthKey(monthKey("2026-08"))).toBe("2026-07");
    expect(nextMonthKey(monthKey("2026-08"))).toBe("2026-09");
  });

  it("рахує довжину місяця", () => {
    expect(daysInMonth(monthKey("2026-01"))).toBe(31);
    expect(daysInMonth(monthKey("2026-04"))).toBe(30);
    expect(daysInMonth(monthKey("2026-02"))).toBe(28);
    expect(daysInMonth(monthKey("2028-02"))).toBe(29);
  });

  it("дає межі місяця включно — саме так вони йдуть у BETWEEN", () => {
    expect(monthRange(monthKey("2026-02"))).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
    });
    expect(monthRange(monthKey("2028-02")).end).toBe("2028-02-29");
    expect(monthRange(monthKey("2026-08")).end).toBe("2026-08-31");
  });
});

describe("тригери крона", () => {
  it("впізнає останній день місяця — сигнал нагадати про пробіг", () => {
    expect(isLastDayOfMonth(isoDate("2026-08-31"))).toBe(true);
    expect(isLastDayOfMonth(isoDate("2026-08-30"))).toBe(false);
    expect(isLastDayOfMonth(isoDate("2026-04-30"))).toBe(true);
    expect(isLastDayOfMonth(isoDate("2026-02-28"))).toBe(true);
    // Високосний рік: 28 лютого вже не останній день.
    expect(isLastDayOfMonth(isoDate("2028-02-28"))).toBe(false);
    expect(isLastDayOfMonth(isoDate("2028-02-29"))).toBe(true);
  });

  it("впізнає перше число — сигнал вивантажити минулий місяць", () => {
    expect(isFirstDayOfMonth(isoDate("2026-08-01"))).toBe(true);
    expect(isFirstDayOfMonth(isoDate("2026-08-02"))).toBe(false);
  });
});
