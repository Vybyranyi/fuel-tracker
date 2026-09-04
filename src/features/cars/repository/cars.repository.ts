import "server-only";

import { asc, eq } from "drizzle-orm";

import { withUser } from "@/db";
import { cars } from "@/db/schema";
import type { Car, FuelType } from "@/features/cars/domain/car";

const columns = {
  id: cars.id,
  name: cars.name,
  makeModel: cars.makeModel,
  plate: cars.plate,
  year: cars.year,
  fuelType: cars.fuelType,
};

function toCar(row: Omit<Car, "fuelType"> & { fuelType: string }): Car {
  return { ...row, fuelType: row.fuelType as FuelType };
}

/** Авто користувача, найстаріше першим — щоб порядок не стрибав між заходами. */
export async function listCars(userId: string): Promise<Car[]> {
  const rows = await withUser(userId, (tx) =>
    tx.select(columns).from(cars).orderBy(asc(cars.createdAt)),
  );

  return rows.map(toCar);
}

/**
 * Одне авто за id.
 *
 * Без умови на власника: її ставить RLS. Якщо id чужий, повернеться `null` —
 * саме так, як має поводитись база, коли рядка «не існує» для цього читача.
 */
export async function findCar(
  userId: string,
  carId: string,
): Promise<Car | null> {
  const [row] = await withUser(userId, (tx) =>
    tx.select(columns).from(cars).where(eq(cars.id, carId)).limit(1),
  );

  return row ? toCar(row) : null;
}

export async function insertCar(
  userId: string,
  input: Omit<Car, "id">,
): Promise<Car> {
  const [row] = await withUser(userId, (tx) =>
    tx
      .insert(cars)
      .values({ ...input, userId })
      .returning(columns),
  );

  if (!row) {
    throw new Error("INSERT не повернув рядок");
  }

  return toCar(row);
}
