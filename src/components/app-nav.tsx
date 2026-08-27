"use client";

import { Fuel, Gauge } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Розділи застосунку. Список росте разом із планом — статистика й
 * налаштування стануть тут ще двома рядками.
 */
const TABS = [
  { href: "/", label: "Заправка", icon: Fuel },
  { href: "/odometer", label: "Пробіг", icon: Gauge },
] as const;

/**
 * Нижня панель навігації.
 *
 * Знизу, а не зверху: застосунок відкривають з головного екрана айфона
 * однією рукою, і верхній край екрана великим пальцем не дістати.
 */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Розділи"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 backdrop-blur"
    >
      {/* Відступ під домашню смугу iPhone, щоб вона не перекривала підписи. */}
      <ul className="mx-auto flex max-w-md pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
