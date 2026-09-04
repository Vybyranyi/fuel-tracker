import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CarList, type CarListItem } from "@/features/cars/components/car-list";
import {
  getActiveCar,
  getCarContents,
  listCars,
} from "@/features/cars/services/cars.service";

export const metadata = { title: "Авто — Пальне" };
export const dynamic = "force-dynamic";

export default async function CarsPage() {
  const [cars, active] = await Promise.all([listCars(), getActiveCar()]);

  // Скільки записів висить на кожному авто — це видно в підтвердженні
  // видалення. Паралельно, бо запитів рівно стільки, скільки авто.
  const items: CarListItem[] = await Promise.all(
    cars.map(async (car) => ({ car, contents: await getCarContents(car.id) })),
  );

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Авто</h1>
        <Button asChild size="sm">
          <Link href="/cars/new">
            <Plus aria-hidden />
            Додати
          </Link>
        </Button>
      </header>

      <CarList items={items} activeId={active?.id ?? ""} />
    </main>
  );
}
