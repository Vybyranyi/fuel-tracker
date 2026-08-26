import { describe, expect, it } from "vitest";

import {
  fuelCalculatorReducer,
  initialCalculatorState,
  type CalculatorAction,
  type CalculatorState,
} from "@/features/fuel/domain/fuel-calculator";
import { decimal2FromNumber, decimal2ToNumber } from "@/lib/units";

const d = decimal2FromNumber;

/** Прогонить кілька дій поспіль — так читається сценарій, а не окремий крок. */
function run(
  state: CalculatorState,
  ...actions: CalculatorAction[]
): CalculatorState {
  return actions.reduce(fuelCalculatorReducer, state);
}

/** Зручний зріз стану у звичайних числах. */
function view(state: CalculatorState) {
  return {
    volume:
      state.volumeLiters === null ? null : decimal2ToNumber(state.volumeLiters),
    price:
      state.pricePerLiter === null
        ? null
        : decimal2ToNumber(state.pricePerLiter),
    total: state.totalCost === null ? null : decimal2ToNumber(state.totalCost),
    source: state.source,
  };
}

const withPrice = initialCalculatorState(d(57.99));

describe("ввід обʼєму", () => {
  it("рахує суму", () => {
    const state = run(withPrice, { type: "volume-entered", value: d(40.55) });
    expect(view(state)).toEqual({
      volume: 40.55,
      price: 57.99,
      total: 2351.49,
      source: "volume",
    });
  });

  it("порожній обʼєм лишає суму порожньою", () => {
    const state = run(
      withPrice,
      { type: "volume-entered", value: d(40) },
      { type: "volume-entered", value: null },
    );
    expect(state.totalCost).toBeNull();
  });
});

describe("ввід суми", () => {
  it("рахує обʼєм і стає ведучим полем", () => {
    const state = run(withPrice, { type: "total-entered", value: d(2000) });
    expect(view(state)).toEqual({
      volume: 34.49,
      price: 57.99,
      total: 2000,
      source: "total",
    });
  });
});

describe("ціна за літр", () => {
  it("не стає ведучою — перераховує суму, коли друкували обʼєм", () => {
    const state = run(
      withPrice,
      { type: "volume-entered", value: d(40) },
      { type: "price-entered", value: d(60) },
    );
    expect(view(state)).toEqual({
      volume: 40,
      price: 60,
      total: 2400,
      source: "volume",
    });
  });

  it("перераховує обʼєм, коли друкували суму", () => {
    const state = run(
      withPrice,
      { type: "total-entered", value: d(2000) },
      { type: "price-entered", value: d(50) },
    );
    // Сума лишилась недоторканою — її ввели руками.
    expect(view(state)).toEqual({
      volume: 40,
      price: 50,
      total: 2000,
      source: "total",
    });
  });

  it("не чіпає введене руками поле навіть після кількох змін ціни", () => {
    const state = run(
      withPrice,
      { type: "total-entered", value: d(1500) },
      { type: "price-entered", value: d(60) },
      { type: "price-entered", value: d(55) },
      { type: "price-entered", value: d(57.99) },
    );
    expect(decimal2ToNumber(state.totalCost!)).toBe(1500);
    expect(decimal2ToNumber(state.volumeLiters!)).toBe(25.87);
  });
});

describe("ціна, з якою не можна рахувати", () => {
  it("порожня ціна лишає похідне поле порожнім", () => {
    const state = run(
      withPrice,
      { type: "volume-entered", value: d(40) },
      { type: "price-entered", value: null },
    );
    expect(state.totalCost).toBeNull();
  });

  it("нульова ціна не дає ані ділення на нуль, ані фальшивого «0,00 ₴»", () => {
    const zeroPriceFromTotal = run(initialCalculatorState(d(0)), {
      type: "total-entered",
      value: d(2000),
    });
    expect(zeroPriceFromTotal.volumeLiters).toBeNull();

    const zeroPriceFromVolume = run(initialCalculatorState(d(0)), {
      type: "volume-entered",
      value: d(40),
    });
    expect(zeroPriceFromVolume.totalCost).toBeNull();
  });

  it("без ціни форма все одно приймає ввід", () => {
    const state = run(initialCalculatorState(null), {
      type: "volume-entered",
      value: d(40),
    });
    expect(decimal2ToNumber(state.volumeLiters!)).toBe(40);
    expect(state.totalCost).toBeNull();
  });
});

describe("кнопки ±", () => {
  it("додають від нуля, коли поле порожнє", () => {
    const state = run(withPrice, { type: "volume-stepped", delta: d(5) });
    expect(view(state)).toMatchObject({ volume: 5, total: 289.95 });
  });

  it("накопичуються і перераховують суму", () => {
    const state = run(
      withPrice,
      { type: "volume-stepped", delta: d(5) },
      { type: "volume-stepped", delta: d(5) },
      { type: "volume-stepped", delta: d(1) },
    );
    expect(view(state)).toMatchObject({ volume: 11, source: "volume" });
  });

  it("не пускають обʼєм у мінус", () => {
    const state = run(
      withPrice,
      { type: "volume-entered", value: d(3) },
      { type: "volume-stepped", delta: d(-5) },
    );
    expect(decimal2ToNumber(state.volumeLiters!)).toBe(0);
  });

  it("роблять обʼєм ведучим, навіть якщо перед тим друкували суму", () => {
    const state = run(
      withPrice,
      { type: "total-entered", value: d(2000) },
      { type: "volume-stepped", delta: d(5) },
    );
    // 34.49 + 5 = 39.49 л, і сума перерахувалась під новий обʼєм:
    // 39.49 × 57.99 = 2290.0251 → 2290.03.
    expect(view(state)).toMatchObject({
      volume: 39.49,
      total: 2290.03,
      source: "volume",
    });
  });
});

describe("очищення після збереження", () => {
  it("лишає ціну, але прибирає обʼєм і суму", () => {
    const state = run(
      withPrice,
      { type: "volume-entered", value: d(40) },
      { type: "cleared", pricePerLiter: d(57.99) },
    );
    expect(view(state)).toEqual({
      volume: null,
      price: 57.99,
      total: null,
      source: "volume",
    });
  });
});

describe("стійкість до довгого крутіння полями", () => {
  it("значення не «пливе» від перемикань між обʼємом і сумою", () => {
    // Найпростіший спосіб зіпсувати такі форми — щоб кожен перехід зсував
    // число на копійку. Після першого округлення стан має бути нерухомим.
    let state = run(withPrice, { type: "volume-entered", value: d(40.55) });
    const afterFirst = view(state);

    for (let i = 0; i < 20; i += 1) {
      state = run(
        state,
        { type: "total-entered", value: state.totalCost },
        { type: "volume-entered", value: state.volumeLiters },
      );
    }

    expect(view(state)).toEqual(afterFirst);
  });
});
