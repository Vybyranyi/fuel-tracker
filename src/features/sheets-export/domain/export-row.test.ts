import { describe, expect, it } from "vitest";

import {
  LAST_COLUMN,
  SHEET_HEADER,
  buildExportRow,
  columnLetter,
  quoteSheetName,
  sheetRange,
} from "@/features/sheets-export/domain/export-row";
import { buildMonthlyStats } from "@/features/stats/domain/monthly-stats";
import { isoDate } from "@/lib/date";

const statsFor = (
  row: { period: string; liters: string; totalCost: string; fillCount: number },
  readings: [string, number][] = [],
) =>
  buildMonthlyStats(
    [row],
    readings.map(([date, km]) => ({
      recordedAt: isoDate(date),
      odometerKm: km,
    })),
  )[0]!;

describe("buildExportRow", () => {
  it("рядок має рівно стільки колонок, скільки шапка", () => {
    const row = buildExportRow(
      statsFor({
        period: "2026-08",
        liters: "117.80",
        totalCost: "6994.17",
        fillCount: 4,
      }),
    );

    expect(row).toHaveLength(SHEET_HEADER.length);
  });

  it("числа лишаються числами, а не форматованими рядками", () => {
    const row = buildExportRow(
      statsFor(
        {
          period: "2026-08",
          liters: "117.80",
          totalCost: "6994.17",
          fillCount: 4,
        },
        [
          ["2026-07-31", 145090],
          ["2026-08-27", 146460],
        ],
      ),
    );

    expect(row).toEqual(["Серпень 2026", 117.8, 6994.17, 59.37, 4, 1370, 8.6]);
    // Саме числа: «6 994,17» Google на іншій локалі поклав би текстом.
    expect(typeof row[2]).toBe("number");
  });

  it("місяць без показань одометра лишає дві останні комірки порожніми", () => {
    const row = buildExportRow(
      statsFor({
        period: "2026-08",
        liters: "42.50",
        totalCost: "2762.50",
        fillCount: 1,
      }),
    );

    expect(row[5]).toBe("");
    expect(row[6]).toBe("");
    // А ті, що є, лишаються числами.
    expect(row[1]).toBe(42.5);
    expect(row[3]).toBe(65);
  });
});

describe("quoteSheetName", () => {
  it("бере назву в лапки", () => {
    expect(quoteSheetName("Пальне")).toBe("'Пальне'");
  });

  it("витримує пробіл у назві", () => {
    // Без лапок Google прочитав би це як аркуш «Витрати» і сміття після нього.
    expect(quoteSheetName("Витрати авто")).toBe("'Витрати авто'");
  });

  it("подвоює одинарну лапку всередині назви", () => {
    expect(quoteSheetName("Пальне'26")).toBe("'Пальне''26'");
  });

  it("складає діапазон", () => {
    expect(sheetRange("Пальне", "A:G")).toBe("'Пальне'!A:G");
  });
});

describe("columnLetter", () => {
  it("рахує літери так само, як сам Sheets", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(6)).toBe("G");
    expect(columnLetter(25)).toBe("Z");
    // Саме тут наївний fromCharCode дав би «[».
    expect(columnLetter(26)).toBe("AA");
    expect(columnLetter(27)).toBe("AB");
    expect(columnLetter(51)).toBe("AZ");
    expect(columnLetter(52)).toBe("BA");
  });

  it("остання колонка відповідає шапці", () => {
    expect(LAST_COLUMN).toBe(columnLetter(SHEET_HEADER.length - 1));
    expect(LAST_COLUMN).toBe("G");
  });
});
