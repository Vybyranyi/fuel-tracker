import { describe, expect, it } from "vitest";

import {
  createFuelEntrySchema,
  deleteFuelEntrySchema,
  updateFuelEntrySchema,
} from "@/features/fuel/schemas/fuel-entry.schema";
import { decimal2ToNumber } from "@/lib/units";

/** Узгоджений набір: 40.55 × 57.99 = 2351.49. */
const valid = {
  filledAt: "2026-08-15",
  volumeLiters: "40.55",
  pricePerLiter: "57.99",
  totalCost: "2351.49",
};

/** Повідомлення всіх помилок — зручніше, ніж копатись у структурі issues. */
function messagesOf(input: unknown): string[] {
  const result = createFuelEntrySchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
}

describe("createFuelEntrySchema", () => {
  it("перетворює рядки на доменні значення", () => {
    const result = createFuelEntrySchema.safeParse(valid);

    expect(result.success).toBe(true);
    if (!result.success) return;

    // На виході вже Decimal2 у сотих, а не рядки.
    expect(result.data.volumeLiters).toBe(4055);
    expect(result.data.pricePerLiter).toBe(5799);
    expect(result.data.totalCost).toBe(235149);
    expect(result.data.filledAt).toBe("2026-08-15");
    expect(result.data.note).toBeNull();
  });

  it("приймає кому як роздільник — так зручніше з телефона", () => {
    const result = createFuelEntrySchema.safeParse({
      ...valid,
      volumeLiters: "40,55",
      pricePerLiter: "57,99",
      totalCost: "2351,49",
    });

    expect(result.success).toBe(true);
    if (result.success)
      expect(decimal2ToNumber(result.data.volumeLiters)).toBe(40.55);
  });

  it("нормалізує нотатку: обрізає пробіли, порожню робить null", () => {
    const withNote = createFuelEntrySchema.safeParse({
      ...valid,
      note: "  ОККО на трасі  ",
    });
    expect(withNote.success && withNote.data.note).toBe("ОККО на трасі");

    const blank = createFuelEntrySchema.safeParse({ ...valid, note: "   " });
    expect(blank.success && blank.data.note).toBeNull();
  });
});

describe("перевірка чисел", () => {
  it("відхиляє не-число", () => {
    expect(messagesOf({ ...valid, volumeLiters: "сорок" })).toContain(
      "Обʼєм: очікується число",
    );
  });

  it("відхиляє нуль і мінус", () => {
    expect(messagesOf({ ...valid, volumeLiters: "0" })).toContain(
      "Обʼєм: має бути більше за нуль",
    );
    expect(messagesOf({ ...valid, pricePerLiter: "-5" })).toContain(
      "Ціна за літр: має бути більше за нуль",
    );
  });

  it("ловить зайвий нуль у кількості", () => {
    // 400 л замість 40 — у бак не влізе, це майже напевно описка.
    expect(messagesOf({ ...valid, volumeLiters: "40000" })).toContain(
      "Обʼєм: схоже на помилку вводу",
    );
  });

  it("відхиляє неіснуючу дату", () => {
    expect(messagesOf({ ...valid, filledAt: "2026-02-30" })).toContain(
      "Некоректна дата",
    );
    expect(messagesOf({ ...valid, filledAt: "15.08.2026" })).toContain(
      "Некоректна дата",
    );
  });
});

describe("узгодженість трьох чисел", () => {
  it("пропускає розходження в межах округлення", () => {
    // Сума 2000 при ціні 57.99 дає 34.49 л, а 34.49 × 57.99 = 1999.87.
    // Це не помилка, а неминучий наслідок двох знаків після коми.
    const result = createFuelEntrySchema.safeParse({
      ...valid,
      volumeLiters: "34.49",
      totalCost: "2000",
    });
    expect(result.success).toBe(true);
  });

  it("ловить суму, яка не має стосунку до обʼєму й ціни", () => {
    const messages = messagesOf({ ...valid, totalCost: "5000" });
    expect(messages.some((m) => m.startsWith("Сума не сходиться"))).toBe(true);
  });

  it("підказує в помилці очікуване значення", () => {
    const messages = messagesOf({ ...valid, totalCost: "5000" });
    expect(messages.join(" ")).toContain("2 351,49 ₴");
  });

  it("прикріплює помилку до поля суми, а не до всієї форми", () => {
    const result = createFuelEntrySchema.safeParse({
      ...valid,
      totalCost: "5000",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["totalCost"]);
  });
});

describe("update і delete", () => {
  it("update вимагає коректний uuid", () => {
    const bad = updateFuelEntrySchema.safeParse({ ...valid, id: "не-uuid" });
    expect(bad.success).toBe(false);

    const good = updateFuelEntrySchema.safeParse({
      ...valid,
      id: "3f4a1c2e-0b7d-4e5f-9a1b-2c3d4e5f6071",
    });
    expect(good.success).toBe(true);
  });

  it("delete приймає лише id", () => {
    expect(
      deleteFuelEntrySchema.safeParse({
        id: "3f4a1c2e-0b7d-4e5f-9a1b-2c3d4e5f6071",
      }).success,
    ).toBe(true);
    expect(deleteFuelEntrySchema.safeParse({ id: "" }).success).toBe(false);
  });
});
