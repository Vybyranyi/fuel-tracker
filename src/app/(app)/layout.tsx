/**
 * Оболонка робочих сторінок.
 *
 * Винесена в групу маршрутів `(app)`, щоб сторінка входу лишалась поза нею:
 * там ні шапки, ні навігації бути не повинно.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10">
      {children}
    </div>
  );
}
