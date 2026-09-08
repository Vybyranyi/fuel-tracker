import { describe, expect, it } from "vitest";

import {
  computeItemAmount,
  splitByKind,
  totalOfItems,
  type ServiceItem,
} from "@/features/service/domain/service-record";
import { decimal2FromNumber, decimal2ToNumber } from "@/lib/units";

const item = (
  amount: number,
  kind: ServiceItem["kind"] = "part",
): ServiceItem => ({
  name: "позиція",
  quantity: decimal2FromNumber(1),
  unitPrice: decimal2FromNumber(amount),
  amount: decimal2FromNumber(amount),
  kind,
});

const money = (value: number) => decimal2FromNumber(value);
const asNumber = (value: number) => decimal2ToNumber(value as never);

describe("computeItemAmount", () => {
  it("множить кількість на ціну", () => {
    expect(asNumber(computeItemAmount(money(4), money(389.9)))).toBe(1559.6);
  });

  it("округлює добуток до двох знаків", () => {
    // 0.75 × 389.90 = 292.425 — третій знак нікуди показати.
    expect(asNumber(computeItemAmount(money(0.75), money(389.9)))).toBe(292.43);
  });

  it("нульова ціна — теж ціна: гарантійна заміна коштує нічого", () => {
    expect(asNumber(computeItemAmount(money(2), money(0)))).toBe(0);
  });
});

describe("totalOfItems", () => {
  it("складає суми позицій", () => {
    expect(asNumber(totalOfItems([item(1559.6), item(300), item(450.5)]))).toBe(
      2310.1,
    );
  });

  it("порожній список дає нуль, а не помилку", () => {
    expect(asNumber(totalOfItems([]))).toBe(0);
  });

  it("складає вже округлені суми, а не перемножує заново", () => {
    // Три позиції по 292.425 округлюються до 292.43 кожна: підсумок має
    // збігатися з тим, що видно рядками (877.29), а не з 877.275.
    const rounded = computeItemAmount(money(0.75), money(389.9));
    const items = [rounded, rounded, rounded].map((amount) => ({
      ...item(0),
      amount,
    }));

    expect(asNumber(totalOfItems(items))).toBe(877.29);
  });
});

describe("splitByKind", () => {
  it("розділяє залізо й роботу", () => {
    const split = splitByKind([
      item(1000, "part"),
      item(250, "labour"),
      item(500, "part"),
    ]);

    expect(asNumber(split.part)).toBe(1500);
    expect(asNumber(split.labour)).toBe(250);
  });

  it("відсутній вид дає нуль", () => {
    const split = splitByKind([item(100, "part")]);
    expect(asNumber(split.labour)).toBe(0);
  });
});
