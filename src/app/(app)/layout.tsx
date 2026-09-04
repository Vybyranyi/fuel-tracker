import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { CarSwitcher } from "@/features/cars/components/car-switcher";
import { getActiveCar, listCars } from "@/features/cars/services/cars.service";

/**
 * Оболонка робочих сторінок.
 *
 * Винесена в групу маршрутів `(app)`, щоб сторінка входу лишалась поза нею:
 * там ні навігації, ні вибору авто бути не повинно.
 *
 * Тут же перевіряємо, чи є хоч одне авто. Кожна сторінка під цією оболонкою
 * показує дані активного авто, тож без нього всі вони однаково впиралися б у
 * «спершу додайте авто» — краще один раз відвести туди, де його додають.
 * Сторінки про авто лежать поза групою, інакше редірект зациклився б.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [active, cars] = await Promise.all([getActiveCar(), listCars()]);

  if (!active) {
    redirect("/cars/new");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      {/* Перемикач у шапці, а не на окремій сторінці: усе нижче стосується
          одного авто, і саме тут це має бути видно, не питаючи. */}
      <header className="flex items-center pt-3">
        <CarSwitcher cars={cars} activeId={active.id} />
      </header>

      {/* Нижній відступ під фіксовану панель навігації плюс запас, щоб
          остання кнопка форми не впиралася в неї. */}
      <div className="flex-1 pb-28">{children}</div>
      <AppNav />
    </div>
  );
}
