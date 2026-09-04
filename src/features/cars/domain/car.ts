export type FuelType = "petrol" | "diesel" | "gas";

export interface Car {
  id: string;
  name: string;
  makeModel: string | null;
  plate: string | null;
  year: number | null;
  fuelType: FuelType;
}

/** Підписи для інтерфейсу. Ключі збігаються зі значеннями enum у базі. */
export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  petrol: "Бензин",
  diesel: "Дизель",
  gas: "Газ",
};

export const FUEL_TYPES = Object.keys(FUEL_TYPE_LABELS) as FuelType[];

/**
 * Другий рядок у списку авто: «Skoda Octavia · AA1234BB · 2015».
 *
 * Усі поля, крім назви, необовʼязкові, тож збираємо лише заповнені — інакше
 * лишалися б висячі роздільники на кшталт «· · 2015».
 */
export function describeCar(car: Car): string {
  return [car.makeModel, car.plate, car.year?.toString()]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}
