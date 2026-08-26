import { describe, expect, it } from "vitest";

import { isoDate, monthKey } from "@/lib/date";
import {
  formatDayMonth,
  formatDecimalInput,
  formatFullDate,
  formatKilometers,
  formatLiters,
  formatMonth,
  formatMonthShort,
  formatMoney,
  formatPricePerLiter,
} from "@/lib/format";
import { decimal2FromNumber } from "@/lib/units";

const value = decimal2FromNumber;

/**
 * Роздільник тисяч — нерозривний пробіл. Порівнюємо саме з U+00A0, бо в цьому
 * і суть `normalizeSpaces`: вивід має бути однаковим у Node і в браузері,
 * інакше React лається на розбіжність при гідратації.
 */
const NBSP = "\u00A0";

describe("числа", () => {
  it("гроші — з комою й гривнею", () => {
    expect(formatMoney(value(2351.49))).toBe(`2${NBSP}351,49${NBSP}₴`);
    expect(formatMoney(value(57.9))).toBe(`57,90${NBSP}₴`);
    expect(formatMoney(value(0))).toBe(`0,00${NBSP}₴`);
  });

  it("обʼєм — завжди два знаки", () => {
    expect(formatLiters(value(40.55))).toBe(`40,55${NBSP}л`);
    expect(formatLiters(value(20))).toBe(`20,00${NBSP}л`);
  });

  it("ціна за літр", () => {
    expect(formatPricePerLiter(value(57.99))).toBe(`57,99${NBSP}₴/л`);
  });

  it("пробіг — без дробової частини", () => {
    expect(formatKilometers(152340)).toBe(`152${NBSP}340${NBSP}км`);
  });

  it("значення для поля вводу — з крапкою, щоб його читав той самий парсер", () => {
    expect(formatDecimalInput(value(40.5))).toBe("40.50");
    expect(formatDecimalInput(value(2351.49))).toBe("2351.49");
  });

  it("не лишає в числах пробілів, які різняться між ICU", () => {
    // Будь-який «вузький» пробіл зламав би гідратацію; має бути тільки U+00A0.
    for (const formatted of [
      formatMoney(value(1234567.89)),
      formatKilometers(1234567),
    ]) {
      expect(formatted).not.toMatch(/[\u202F\u2009\u2007\u2060]/u);
      expect(formatted).toContain(NBSP);
    }
  });
});

describe("дати", () => {
  it("день і місяць", () => {
    expect(formatDayMonth(isoDate("2026-08-15"))).toBe("15 серпня");
    expect(formatDayMonth(isoDate("2026-01-01"))).toBe("1 січня");
  });

  it("повна дата", () => {
    expect(formatFullDate(isoDate("2026-08-15"))).toBe("15 серпня 2026 р.");
  });

  it("місяць — як заголовок, без «р.» і з великої", () => {
    expect(formatMonth(monthKey("2026-08"))).toBe("Серпень 2026");
    expect(formatMonth(monthKey("2026-01"))).toBe("Січень 2026");
  });

  it("скорочений місяць для осі графіка", () => {
    expect(formatMonthShort(monthKey("2026-08"))).toBe("серп.");
    expect(formatMonthShort(monthKey("2026-01"))).toBe("січ.");
  });

  it("не зсуває дату на добу через часовий пояс", () => {
    // IsoDate — уже київська дата. Якби форматер трактував її як UTC-опівніч
    // і виводив у місцевому поясі, перше число поїхало б на попередній місяць.
    expect(formatDayMonth(isoDate("2026-03-01"))).toBe("1 березня");
    expect(formatDayMonth(isoDate("2026-12-31"))).toBe("31 грудня");
  });
});
