import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import type { CarScope } from "@/db";
import { requireUser } from "@/features/auth/services/session";
import type { Car, CarContents } from "@/features/cars/domain/car";
import * as repository from "@/features/cars/repository/cars.repository";
import type { CreateCarInput } from "@/features/cars/schemas/car.schema";
import { UserFacingError } from "@/lib/safe-action";

/** Яке авто відкрите зараз. Переживає перезаходи, але не привʼязане до пристрою. */
export const ACTIVE_CAR_COOKIE = "fuel_car";

const ACTIVE_CAR_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export const listCars = cache(async (): Promise<Car[]> => {
  const user = await requireUser();
  return repository.listCars(user.id);
});

/**
 * Авто, з яким людина зараз працює.
 *
 * Кука лише підказує вибір — вона не є дозволом: значення звіряється зі
 * списком авто цього користувача, тож підкладена чужа кука просто ігнорується.
 * Якщо вибір недійсний або його немає, беремо перше авто.
 *
 * `null` означає рівно одне: авто ще жодного не заведено.
 */
export const getActiveCar = cache(async (): Promise<Car | null> => {
  const [all, cookieStore] = await Promise.all([listCars(), cookies()]);

  if (all.length === 0) return null;

  const preferred = cookieStore.get(ACTIVE_CAR_COOKIE)?.value;

  return all.find((car) => car.id === preferred) ?? all[0]!;
});

/**
 * Те, з чим працює кожен сервіс даних: хто питає і про яке авто.
 *
 * Виносити це в кожен сервіс окремо означало б повторювати дві перевірки
 * підряд у півтора десятка місць — і колись одну з них забути.
 */
export async function requireCarScope(): Promise<CarScope> {
  const [user, car] = await Promise.all([requireUser(), getActiveCar()]);

  if (!car) {
    throw new UserFacingError("Спершу додайте авто");
  }

  return { userId: user.id, carId: car.id };
}

/**
 * Заводить авто й одразу робить його активним.
 *
 * Другий крок важливіший, ніж здається: без нього після додавання другого
 * авто людина лишалась би на першому й не розуміла, куди поділось щойно
 * створене.
 */
export async function createCar(input: CreateCarInput): Promise<Car> {
  const user = await requireUser();

  const car = await repository.insertCar(user.id, {
    name: input.name,
    makeModel: input.makeModel,
    plate: input.plate,
    year: input.year,
    fuelType: input.fuelType as Car["fuelType"],
  });

  await setActiveCar(car.id);

  return car;
}

/** Викликається лише з server actions — серверні компоненти куки не пишуть. */
export async function setActiveCar(carId: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACTIVE_CAR_COOKIE, carId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_CAR_MAX_AGE_SECONDS,
  });
}

/** Одне авто за id — для сторінки редагування. */
export async function getCar(carId: string): Promise<Car | null> {
  const user = await requireUser();
  return repository.findCar(user.id, carId);
}

export async function getCarContents(carId: string): Promise<CarContents> {
  const user = await requireUser();
  return repository.countCarContents(user.id, carId);
}

export async function updateCar(
  carId: string,
  input: CreateCarInput,
): Promise<Car> {
  const user = await requireUser();

  const car = await repository.updateCar(user.id, carId, {
    name: input.name,
    makeModel: input.makeModel,
    plate: input.plate,
    year: input.year,
    fuelType: input.fuelType as Car["fuelType"],
  });

  if (!car) {
    throw new UserFacingError("Це авто вже видалено");
  }

  return car;
}

/**
 * Видаляє авто разом з усією його історією.
 *
 * Каскад описаний у схемі: заправки й показання пробігу зникають самі. Не
 * лишаємо їх «осиротілими» навмисно — без авто вони не мають ні сенсу, ні
 * способу колись знову стати видимими.
 */
export async function deleteCar(carId: string): Promise<void> {
  const user = await requireUser();

  if (!(await repository.deleteCar(user.id, carId))) {
    throw new UserFacingError("Це авто вже видалено");
  }
}

/**
 * Перемикає активне авто.
 *
 * Перевіряємо, що воно наше, перш ніж класти в куку: кука сама по собі не є
 * дозволом, але зберігати в ній чужий id означало б тримати сміття, яке
 * `getActiveCar` мовчки ігноруватиме, — і людина не зрозуміє, чому вибір
 * не запамʼятався.
 */
export async function switchCar(carId: string): Promise<void> {
  const user = await requireUser();

  if (!(await repository.findCar(user.id, carId))) {
    throw new UserFacingError("Такого авто немає");
  }

  await setActiveCar(carId);
}
