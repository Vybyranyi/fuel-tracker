import { Car, ChevronRight, Download, Gauge, Settings } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Ще — Пальне" };

/** Розділи, до яких ходять рідше, ніж до заправок і статистики. */
const SECTIONS = [
  { href: "/odometer", label: "Пробіг", icon: Gauge },
  { href: "/cars", label: "Мої авто", icon: Car },
  { href: "/export", label: "Вивантаження", icon: Download },
  { href: "/settings", label: "Налаштування", icon: Settings },
] as const;

export default function MorePage() {
  return (
    <main className="flex flex-col gap-6 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ще</h1>

      <ul className="flex flex-col gap-2">
        {SECTIONS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
            >
              <Icon className="size-5 text-muted-foreground" aria-hidden />
              <span className="flex-1">{label}</span>
              <ChevronRight
                className="size-4 text-muted-foreground"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
