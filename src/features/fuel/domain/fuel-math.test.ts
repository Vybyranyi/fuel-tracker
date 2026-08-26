import { describe, expect, it } from "vitest";

import {
  areAmountsConsistent,
  computePricePerLiter,
  computeTotalCost,
  computeVolumeLiters,
  consistencyTolerance,
} from "@/features/fuel/domain/fuel-math";
import { decimal2, decimal2FromNumber, decimal2ToNumber } from "@/lib/units";

/** Читабельний запис: liters(40.55) замість decimal2(4055). */
const money = decimal2FromNumber;
const liters = decimal2FromNumber;
const asNumber = decimal2ToNumber;

describe("computeTotalCost — ввели обʼєм і ціну", () => {
  it("рахує суму заправки", () => {
    // 40.55 × 57.99 = 2351.4945 → 2351.49
    expect(asNumber(computeTotalCost(liters(40.55), money(57.99)))).toBe(
      2351.49,
    );
  });

  it("працює на круглих обʼємах — саме їх дають кнопки +5", () => {
    expect(asNumber(computeTotalCost(liters(20), money(57.9)))).toBe(1158);
    expect(asNumber(computeTotalCost(liters(45), money(60)))).toBe(2700);
  });

  it("округлює до копійки", () => {
    // 10 × 57.995 неможливе: ціна теж має два знаки. Беремо 33.33 × 3.33.
    expect(asNumber(computeTotalCost(liters(33.33), money(3.33)))).toBe(110.99);
  });
});

describe("computeVolumeLiters — ввели суму і ціну", () => {
  it("рахує, скільки літрів вийшло на суму", () => {
    expect(asNumber(computeVolumeLiters(money(2000), money(57.99)))).toBe(
      34.49,
    );
  });

  it("типова кругла сума на заправці", () => {
    expect(asNumber(computeVolumeLiters(money(1500), money(60)))).toBe(25);
  });
});

describe("computePricePerLiter — для середньої ціни за місяць", () => {
  it("ділить гроші на літри", () => {
    expect(asNumber(computePricePerLiter(money(2351.49), liters(40.55)))).toBe(
      57.99,
    );
  });
});

describe("зворотність переходів", () => {
  // Форма дозволяє крутити обʼєм ↔ сума скільки завгодно. Якщо кожен перехід
  // зсуватиме значення, число «попливе» просто від того, що по ньому клікали.
  const prices = [55, 57.99, 60.5, 3.33, 199.99];
  const volumes = [5, 10, 20, 40.55, 33.33, 0.01];

  it("обʼєм → сума → обʼєм повертається з точністю до сотої", () => {
    for (const price of prices) {
      for (const volume of volumes) {
        const total = computeTotalCost(liters(volume), money(price));
        const back = computeVolumeLiters(total, money(price));
        expect(
          Math.abs(back - liters(volume)),
          `${volume} л за ${price} ₴/л дало ${asNumber(back)} л`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  it("повторний прогін уже нічого не зсуває", () => {
    // Після першого округлення значення має стати нерухомою точкою.
    const price = money(57.99);
    const first = computeVolumeLiters(
      computeTotalCost(liters(40.55), price),
      price,
    );
    const second = computeVolumeLiters(computeTotalCost(first, price), price);
    expect(second).toBe(first);
  });
});

describe("consistencyTolerance", () => {
  it("росте разом із ціною", () => {
    // Невидимий третій знак у літрах коштує тим більше, чим дорожче пальне.
    expect(asNumber(consistencyTolerance(money(57.99)))).toBe(0.3);
    expect(asNumber(consistencyTolerance(money(100)))).toBe(0.51);
    expect(asNumber(consistencyTolerance(money(1)))).toBe(0.02);
  });
});

describe("areAmountsConsistent", () => {
  it("пропускає узгоджений запис", () => {
    expect(
      areAmountsConsistent({
        volumeLiters: liters(40.55),
        pricePerLiter: money(57.99),
        totalCost: money(2351.49),
      }),
    ).toBe(true);
  });

  it("пропускає розходження в межах округлення", () => {
    // Такий запис отримується, якщо ввести суму 2000 і ціну 57.99:
    // обʼєм 34.49 л, а 34.49 × 57.99 = 1999.87 — на 13 копійок менше.
    const price = money(57.99);
    const total = money(2000);
    const volume = computeVolumeLiters(total, price);
    expect(
      areAmountsConsistent({
        volumeLiters: volume,
        pricePerLiter: price,
        totalCost: total,
      }),
    ).toBe(true);
  });

  it("ловить суму, підправлену руками", () => {
    expect(
      areAmountsConsistent({
        volumeLiters: liters(40.55),
        pricePerLiter: money(57.99),
        totalCost: money(2500),
      }),
    ).toBe(false);
  });

  it("ловить розходження трохи більше за допуск", () => {
    const price = money(57.99);
    const volume = liters(40.55);
    const exact = computeTotalCost(volume, price);
    const tolerance = consistencyTolerance(price);

    const atEdge = decimal2(exact + tolerance);
    const justOver = decimal2(exact + tolerance + 1);

    expect(
      areAmountsConsistent({
        volumeLiters: volume,
        pricePerLiter: price,
        totalCost: atEdge,
      }),
    ).toBe(true);
    expect(
      areAmountsConsistent({
        volumeLiters: volume,
        pricePerLiter: price,
        totalCost: justOver,
      }),
    ).toBe(false);
  });
});
