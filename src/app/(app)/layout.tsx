import { AppNav } from "@/components/app-nav";

/**
 * Оболонка робочих сторінок.
 *
 * Винесена в групу маршрутів `(app)`, щоб сторінка входу лишалась поза нею:
 * там ні навігації, ні виходу бути не повинно.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      {/* Нижній відступ під фіксовану панель навігації плюс запас, щоб
          остання кнопка форми не впиралася в неї. */}
      <div className="flex-1 pb-28">{children}</div>
      <AppNav />
    </div>
  );
}
