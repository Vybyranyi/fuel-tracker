import {
  decimal2,
  divideDecimals,
  multiplyDecimals,
  type Decimal2,
} from "@/lib/units";

/**
 * Заправка описується трьома числами, з яких незалежні лише два:
 *
 *   сума = обʼєм × ціна за літр
 *
 * У формі ціна за літр — окремий якір (підставляється з попередньої
 * заправки), а обʼєм і сума — повʼязана пара: те, що редагували останнім,
 * веде, друге перераховується. Функції нижче й реалізують ці три переходи.
 */
export interface FuelEntryAmounts {
  volumeLiters: Decimal2;
  pricePerLiter: Decimal2;
  totalCost: Decimal2;
}

/** Ввели обʼєм і ціну — рахуємо, скільки це коштувало. */
export function computeTotalCost(
  volumeLiters: Decimal2,
  pricePerLiter: Decimal2,
): Decimal2 {
  return multiplyDecimals(volumeLiters, pricePerLiter);
}

/** Ввели суму і ціну — рахуємо, скільки літрів на неї вийшло. */
export function computeVolumeLiters(
  totalCost: Decimal2,
  pricePerLiter: Decimal2,
): Decimal2 {
  return divideDecimals(totalCost, pricePerLiter);
}

/**
 * Ввели обʼєм і суму — рахуємо ціну за літр.
 *
 * У формі цей перехід не використовується (ціна там якір), але він потрібен
 * аналітиці: середня ціна за місяць — це сума грошей поділена на суму літрів,
 * а не середнє арифметичне цін окремих заправок.
 */
export function computePricePerLiter(
  totalCost: Decimal2,
  volumeLiters: Decimal2,
): Decimal2 {
  return divideDecimals(totalCost, volumeLiters);
}

/**
 * Наскільки сума має право розходитись із добутком обʼєму на ціну.
 *
 * Розходження неминуче: обидва похідні значення округлені до сотих, і назад
 * тотожність уже не сходиться точно. Допуск не вгадується «на око», а
 * складається з двох джерел:
 *
 *   • половина соті — округлення самої суми;
 *   • половина соті обʼєму, помножена на ціну, — округлення обʼєму.
 *
 * У сотих це 1 + ceil(ціна / 200). Для 57.99 ₴/л виходить 30 сотих, тобто
 * 0.30 ₴ — рівно стільки, скільки коштує невидимий третій знак у літрах.
 */
export function consistencyTolerance(pricePerLiter: Decimal2): Decimal2 {
  return decimal2(1 + Math.ceil(Math.abs(pricePerLiter) / 200));
}

/**
 * Чи узгоджені між собою три числа заправки.
 *
 * Використовується у zod-схемі: захищає від запису, у якому суму підправили
 * руками так, що вона більше не має стосунку до обʼєму й ціни.
 */
export function areAmountsConsistent({
  volumeLiters,
  pricePerLiter,
  totalCost,
}: FuelEntryAmounts): boolean {
  const expected = computeTotalCost(volumeLiters, pricePerLiter);
  return Math.abs(totalCost - expected) <= consistencyTolerance(pricePerLiter);
}
