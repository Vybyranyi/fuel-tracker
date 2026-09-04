import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Оболонка сторінок про авто.
 *
 * Свідомо поза групою `(app)`: та відводить сюди тих, у кого авто ще немає, і
 * якби ці сторінки були під нею, редірект вказував би сам на себе.
 *
 * Нижньої навігації тут немає — це вхід і вихід, а не розділ, у якому живуть.
 * Тому замість неї одне посилання назад.
 */
export default function CarsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6">
      <Link
        href="/"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        До заправок
      </Link>

      {children}
    </div>
  );
}
