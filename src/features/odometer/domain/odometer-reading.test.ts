import { describe, expect, it } from "vitest";

import {
  describeOdometerAnomaly,
  distanceBetween,
  odometerReadingFromRow,
  type OdometerRawRow,
} from "@/features/odometer/domain/odometer-reading";
import { isoDate } from "@/lib/date";
import { formatKilometers } from "@/lib/format";

const at = (date: string, km: number) => ({
  recordedAt: isoDate(date),
  odometerKm: km,
});

const none = { previous: null, next: null };

describe("describeOdometerAnomaly", () => {
  it("мовчить, коли порівнювати нема з чим", () => {
    expect(
      describeOdometerAnomaly(152340, isoDate("2026-08-31"), none),
    ).toBeNull();
  });

  it("мовчить на звичайному місячному пробігу", () => {
    // Півтори тисячі кілометрів за місяць — цілком буденно.
    expect(
      describeOdometerAnomaly(153840, isoDate("2026-08-31"), {
        previous: at("2026-07-31", 152340),
        next: null,
      }),
    ).toBeNull();
  });

  it("ловить показання, менше за попереднє", () => {
    const warning = describeOdometerAnomaly(150000, isoDate("2026-08-31"), {
      previous: at("2026-07-31", 152340),
      next: null,
    });

    expect(warning).toContain("Менше за попереднє");
    expect(warning).toContain(formatKilometers(152340));
  });

  it("ловить показання, більше за наступне", () => {
    // Запис заднім числом між уже наявними теж має бути узгодженим.
    const warning = describeOdometerAnomaly(160000, isoDate("2026-08-15"), {
      previous: at("2026-07-31", 152340),
      next: at("2026-08-31", 153840),
    });

    expect(warning).toContain("Більше за наступне");
    expect(warning).toContain(formatKilometers(153840));
  });

  it("ловить зайву цифру", () => {
    // 1 523 400 замість 152 340 — за місяць таке не проїхати.
    const warning = describeOdometerAnomaly(1_523_400, isoDate("2026-08-31"), {
      previous: at("2026-07-31", 152340),
      next: null,
    });

    expect(warning).toContain("зайву цифру");
  });

  it("не чіпляється до великого пробігу за довгий проміжок", () => {
    // 60 000 км за рік — багато, але для далекобійника нормально.
    expect(
      describeOdometerAnomaly(212_340, isoDate("2027-07-31"), {
        previous: at("2026-07-31", 152340),
        next: null,
      }),
    ).toBeNull();
  });

  it("не ділить на нуль, коли дата та сама", () => {
    // Виправлення показання за той самий день: проміжок нульовий.
    expect(() =>
      describeOdometerAnomaly(152_400, isoDate("2026-07-31"), {
        previous: at("2026-07-31", 152340),
        next: null,
      }),
    ).not.toThrow();
  });

  it("рівне попередньому пропускає", () => {
    // Авто просто стояло — це не помилка.
    expect(
      describeOdometerAnomaly(152340, isoDate("2026-08-31"), {
        previous: at("2026-07-31", 152340),
        next: null,
      }),
    ).toBeNull();
  });
});

describe("distanceBetween", () => {
  it("рахує різницю", () => {
    expect(
      distanceBetween(at("2026-07-31", 152340), at("2026-08-31", 153840)),
    ).toBe(1500);
  });

  it("повертає null, коли порівнювати нема з чим", () => {
    expect(distanceBetween(null, at("2026-08-31", 153840))).toBeNull();
    expect(distanceBetween(at("2026-07-31", 152340), null)).toBeNull();
  });

  it("повертає null на суперечливих значеннях, а не відʼємну відстань", () => {
    expect(
      distanceBetween(at("2026-07-31", 153840), at("2026-08-31", 152340)),
    ).toBeNull();
  });
});

describe("odometerReadingFromRow", () => {
  const row: OdometerRawRow = {
    id: "3f4a1c2e-0b7d-4e5f-9a1b-2c3d4e5f6071",
    recordedAt: "2026-08-31",
    odometerKm: 152340,
    note: null,
    createdAt: new Date("2026-08-31T18:00:00Z"),
    updatedAt: new Date("2026-08-31T18:00:00Z"),
  };

  it("перевіряє дату на межі з БД", () => {
    expect(odometerReadingFromRow(row).recordedAt).toBe("2026-08-31");
    expect(() =>
      odometerReadingFromRow({ ...row, recordedAt: "2026-02-30" }),
    ).toThrow(RangeError);
  });
});
