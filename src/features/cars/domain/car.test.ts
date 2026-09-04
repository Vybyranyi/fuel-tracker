import { describe, expect, it } from "vitest";

import { describeCar, type Car } from "@/features/cars/domain/car";

const car = (overrides: Partial<Car>): Car => ({
  id: "id",
  name: "Октавія",
  makeModel: null,
  plate: null,
  year: null,
  fuelType: "petrol",
  ...overrides,
});

describe("describeCar", () => {
  it("збирає заповнені поля через роздільник", () => {
    expect(
      describeCar(
        car({ makeModel: "Skoda Octavia", plate: "AA1234BB", year: 2015 }),
      ),
    ).toBe("Skoda Octavia · AA1234BB · 2015");
  });

  it("не лишає висячих роздільників, коли заповнено не все", () => {
    expect(describeCar(car({ plate: "AA1234BB" }))).toBe("AA1234BB");
    expect(describeCar(car({ makeModel: "Ланос", year: 2007 }))).toBe(
      "Ланос · 2007",
    );
  });

  it("порожній опис — це порожній рядок, а не «null»", () => {
    expect(describeCar(car({}))).toBe("");
  });
});
