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

/** Ширина однієї вкладки. Капсула росте разом із кількістю розділів. */
const TAB_WIDTH_REM = 5.5;

/**
 * Нижня панель навігації.
 *
 * Знизу, а не зверху: застосунок відкривають з головного екрана айфона
 * однією рукою, і верхній край екрана великим пальцем не дістати.
 *
 * Панель плаває над контентом, а не приклеєна до краю: саме завдяки просвіту
 * з боків і знизу видно, що під нею щось проходить, — без цього розмиття
 * нема на чому показати себе.
 */
export function AppNav() {
  const pathname = usePathname();
  const activeIndex = TABS.findIndex((tab) => tab.href === pathname);

  return (
    <nav
      aria-label="Розділи"
      className="fixed inset-x-0 bottom-0 z-10 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <ul
        className="relative flex rounded-full p-1.5 glass-surface"
        style={{
          width: `min(calc(100% - 2rem), ${TABS.length * TAB_WIDTH_REM}rem)`,
        }}
      >
        {/*
          Індикатор — один елемент, що переїжджає між комірками, а не підсвітка
          на кожній вкладці. Так перехід читається як рух однієї речі: саме це
          відрізняє живий матеріал від двох незалежних кнопок.
        */}
        {activeIndex >= 0 ? (
          <span
            aria-hidden
            className="absolute inset-y-1.5 left-1.5 rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: `calc((100% - 0.75rem) / ${TABS.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
              background: "var(--glass-active)",
            }}
          />
        ) : null}

        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <li key={href} className="relative flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-full text-[11px] font-medium transition-colors",
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
