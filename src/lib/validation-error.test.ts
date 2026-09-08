import { describe, expect, it } from "vitest";

import { firstValidationError } from "@/lib/validation-error";

describe("firstValidationError", () => {
  it("бере повідомлення з верхнього рівня", () => {
    expect(
      firstValidationError({
        email: { _errors: ["Схоже на неправильну адресу"] },
      }),
    ).toBe("Схоже на неправильну адресу");
  });

  it("знаходить помилку всередині масиву", () => {
    // Саме так `next-safe-action` віддає помилку позиції ТО. Плаский пошук
    // тут мовчав би, і форма не показала б нічого.
    expect(
      firstValidationError({
        items: { 0: { name: { _errors: ["Без назви позицію не впізнати"] } } },
      }),
    ).toBe("Без назви позицію не впізнати");
  });

  it("бачить помилку самого масиву, а не лише його елементів", () => {
    expect(
      firstValidationError({
        items: { _errors: ["Додайте хоча б одну позицію"] },
      }),
    ).toBe("Додайте хоча б одну позицію");
  });

  it("порожні структури нічого не дають", () => {
    for (const value of [
      null,
      undefined,
      {},
      { items: { _errors: [] } },
      "рядок",
    ]) {
      expect(firstValidationError(value)).toBeUndefined();
    }
  });
});
