import { CarForm } from "@/features/cars/components/car-form";
import { listCars } from "@/features/cars/services/cars.service";

export const metadata = { title: "Нове авто — Пальне" };
export const dynamic = "force-dynamic";

/**
 * Свідомо поза групою `(app)`.
 *
 * Оболонка `(app)` відводить сюди тих, у кого ще немає авто. Якби ця сторінка
 * теж була під нею, вона відводила б саму себе — і редірект зациклився б.
 * Нижня навігація тут теж ні до чого: іти поки нема куди.
 */
export default async function NewCarPage() {
  const isFirst = (await listCars()).length === 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isFirst ? "Додайте авто" : "Нове авто"}
        </h1>
        {isFirst ? (
          <p className="text-sm text-muted-foreground">
            Заправки й пробіг ведуться по авто, тож почнемо з нього. Обовʼязкова
            лише назва — решту можна дописати пізніше.
          </p>
        ) : null}
      </header>

      <CarForm />
    </main>
  );
}
