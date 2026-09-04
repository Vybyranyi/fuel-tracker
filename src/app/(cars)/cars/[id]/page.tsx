import { notFound } from "next/navigation";

import { CarForm } from "@/features/cars/components/car-form";
import { getCar } from "@/features/cars/services/cars.service";

export const metadata = { title: "Зміна авто — Пальне" };
export const dynamic = "force-dynamic";

export default async function EditCarPage({ params }: PageProps<"/cars/[id]">) {
  const { id } = await params;
  const car = await getCar(id);

  // `getCar` віддає `null` і для чужого авто теж: RLS не розрізняє «немає» і
  // «не твоє», і це правильно — інакше по відповіді можна було б дізнатися,
  // що таке авто в когось існує.
  if (!car) notFound();

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{car.name}</h1>
      <CarForm car={car} />
    </main>
  );
}
