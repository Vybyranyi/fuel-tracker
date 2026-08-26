import {
  computeTotalCost,
  computeVolumeLiters,
} from "@/features/fuel/domain/fuel-math";
import { decimal2, type Decimal2 } from "@/lib/units";

/**
 * Яке з двох повʼязаних полів людина заповнила останнім.
 *
 * Обʼєм і сума звʼязані через ціну, тож незалежним може бути лише одне з них.
 * Те, у якому щойно друкували, — ведуче; друге перераховується. Без цієї
 * позначки перерахунок ціни був би неоднозначним: незрозуміло, яке зі значень
 * зберігати, а яке міняти.
 */
export type AmountSource = "volume" | "total";

export interface CalculatorState {
  volumeLiters: Decimal2 | null;
  pricePerLiter: Decimal2 | null;
  totalCost: Decimal2 | null;
  source: AmountSource;
}

export type CalculatorAction =
  | { type: "volume-entered"; value: Decimal2 | null }
  | { type: "total-entered"; value: Decimal2 | null }
  | { type: "price-entered"; value: Decimal2 | null }
  | { type: "volume-stepped"; delta: Decimal2 }
  | { type: "cleared"; pricePerLiter: Decimal2 | null };

/**
 * Ціна, придатна для перерахунку.
 *
 * Нуль сюди не годиться: ділити на нього не можна, а множення дало б суму 0 —
 * поле показувало б «0,00 ₴», ніби це справжній результат. Поки ціни нема,
 * похідне поле лишається порожнім.
 */
function usablePrice(price: Decimal2 | null): Decimal2 | null {
  return price !== null && price > 0 ? price : null;
}

function deriveTotal(
  volume: Decimal2 | null,
  price: Decimal2 | null,
): Decimal2 | null {
  const usable = usablePrice(price);
  if (volume === null || usable === null) return null;
  return computeTotalCost(volume, usable);
}

function deriveVolume(
  total: Decimal2 | null,
  price: Decimal2 | null,
): Decimal2 | null {
  const usable = usablePrice(price);
  if (total === null || usable === null) return null;
  return computeVolumeLiters(total, usable);
}

/**
 * Стан трьох повʼязаних полів форми.
 *
 * Правила рівно два:
 *   • у яке з полів «обʼєм / сума» ввели — те стає ведучим;
 *   • при будь-якій зміні перераховується те з двох, яке не ведуче.
 *
 * Ціна за літр — окремий якір: вона не стає ведучою ніколи, бо підставляється
 * з попередньої заправки й міняється рідше за решту.
 */
export function fuelCalculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case "volume-entered":
      return {
        ...state,
        source: "volume",
        volumeLiters: action.value,
        totalCost: deriveTotal(action.value, state.pricePerLiter),
      };

    case "total-entered":
      return {
        ...state,
        source: "total",
        totalCost: action.value,
        volumeLiters: deriveVolume(action.value, state.pricePerLiter),
      };

    case "price-entered":
      // Ціна міняє те поле, яке не ведуче: якщо друкували обʼєм — суму,
      // якщо суму — обʼєм. Введене вручну лишається недоторканим.
      return state.source === "volume"
        ? {
            ...state,
            pricePerLiter: action.value,
            totalCost: deriveTotal(state.volumeLiters, action.value),
          }
        : {
            ...state,
            pricePerLiter: action.value,
            volumeLiters: deriveVolume(state.totalCost, action.value),
          };

    case "volume-stepped": {
      // Кнопки ±5 — це той самий ввід обʼєму, тому вони теж роблять його
      // ведучим. Нижче нуля не пускаємо: відʼємної заправки не буває.
      const next = decimal2(
        Math.max(0, (state.volumeLiters ?? decimal2(0)) + action.delta),
      );
      return {
        ...state,
        source: "volume",
        volumeLiters: next,
        totalCost: deriveTotal(next, state.pricePerLiter),
      };
    }

    case "cleared":
      // Після збереження ціна лишається: наступна заправка майже напевно буде
      // за тією ж ціною, і вводити її вдруге — зайва робота.
      return {
        volumeLiters: null,
        pricePerLiter: action.pricePerLiter,
        totalCost: null,
        source: "volume",
      };
  }
}

export function initialCalculatorState(
  pricePerLiter: Decimal2 | null,
): CalculatorState {
  return {
    volumeLiters: null,
    pricePerLiter,
    totalCost: null,
    source: "volume",
  };
}
