import { describe, expect, it } from "vitest";

import {
  fuelEntryFromRow,
  type FuelEntryRawRow,
} from "@/features/fuel/domain/fuel-entry";
import { decimal2ToNumber } from "@/lib/units";

/** Рядок у тому вигляді, як його віддає Drizzle: numeric — рядками. */
const row: FuelEntryRawRow = {
  id: "3f4a1c2e-0b7d-4e5f-9a1b-2c3d4e5f6071",
  filledAt: "2026-08-15",
  volumeLiters: "40.55",
  pricePerLiter: "57.99",
  totalCost: "2351.49",
  note: null,
  createdAt: new Date("2026-08-15T18:00:00Z"),
  updatedAt: new Date("2026-08-15T18:00:00Z"),
};

describe("fuelEntryFromRow", () => {
  it("переводить рядки numeric у Decimal2", () => {
    const entry = fuelEntryFromRow(row);

    expect(entry.volumeLiters).toBe(4055);
    expect(entry.pricePerLiter).toBe(5799);
    expect(entry.totalCost).toBe(235149);
    expect(decimal2ToNumber(entry.totalCost)).toBe(2351.49);
  });

  it("переносить решту полів як є", () => {
    const entry = fuelEntryFromRow({ ...row, note: "ОККО" });

    expect(entry.id).toBe(row.id);
    expect(entry.filledAt).toBe("2026-08-15");
    expect(entry.note).toBe("ОККО");
    expect(entry.createdAt).toEqual(row.createdAt);
  });

  it("не мовчить, коли в базі опинилось щось непридатне", () => {
    // Межа з БД — правильне місце, щоб таке впало. Далі воно розповзлося б
    // по статистиці й графіках уже як NaN, і шукати джерело було б ніде.
    expect(() => fuelEntryFromRow({ ...row, volumeLiters: "сорок" })).toThrow(
      TypeError,
    );

    expect(() => fuelEntryFromRow({ ...row, filledAt: "2026-02-30" })).toThrow(
      RangeError,
    );
  });

  it("зберігає нулі в дробовій частині", () => {
    const entry = fuelEntryFromRow({ ...row, volumeLiters: "40.50" });
    expect(entry.volumeLiters).toBe(4050);
  });
});
