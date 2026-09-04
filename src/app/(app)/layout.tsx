import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { getActiveCar } from "@/features/cars/services/cars.service";

/**
 * Оболонка робочих сторінок.
 *
 * Винесена в групу маршрутів `(app)`, щоб сторінка входу лишалась поза нею:
 * там ні навігації, ні виходу бути не повинно.
 *
 * Тут же перевіряємо, чи є хоч одне авто. Кожна сторінка під цією оболонкою
 * показує дані активного авто, тож без нього всі вони однаково впиралися б у
 * «спершу додайте авто» — краще один раз відвести туди, де його додають.
 * Сама сторінка додавання лежить поза групою, інакше редірект зациклився б.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!(await getActiveCar())) {
    redirect("/cars/new");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      {/* Нижній відступ під фіксовану панель навігації плюс запас, щоб
          остання кнопка форми не впиралася в неї. */}
      <div className="flex-1 pb-28">{children}</div>
      <AppNav />
    </div>
  );
}
