import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  /**
   * Зміна проти попереднього місяця у відсотках.
   *
   * Показуємо лише стрілку й число: «до минулого місяця» повторене на чотирьох
   * картках поспіль — це шум, який до того ж не влазив у рядок. Проти чого
   * порівняння, каже заголовок розділу.
   */
  deltaPercent?: number | null;
  /**
   * Чи є зростання доброю новиною. Для витрат — ні, для пробігу — байдуже.
   * `null` вимикає забарвлення: показуємо саму зміну, без оцінки.
   */
  upIsGood?: boolean | null;
  hint?: string;
}

/**
 * Картка з одним числом.
 *
 * Число тут і є графіком: малювати одну колонку заради «витрачено за місяць»
 * означало б віддати півекрана під те, що читається за мить.
 */
export function StatTile({
  label,
  value,
  deltaPercent,
  upIsGood = null,
  hint,
}: StatTileProps) {
  const hasDelta =
    deltaPercent !== null && deltaPercent !== undefined && deltaPercent !== 0;
  const isUp = (deltaPercent ?? 0) > 0;

  // Забарвлюємо зміну лише там, де в неї є знак: зростання витрат — погано,
  // а більший пробіг сам по собі ні добре, ні погано.
  const deltaTone =
    upIsGood === null
      ? "text-muted-foreground"
      : isUp === upIsGood
        ? "text-[color:var(--stat-good)]"
        : "text-[color:var(--stat-bad)]";

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      {/* Пропорційні цифри, а не табличні: у великому окремому числі рівна
          ширина знаків робить його розрідженим. */}
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>

      {hasDelta ? (
        <p className={cn("mt-1 flex items-center gap-0.5 text-xs", deltaTone)}>
          {isUp ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )}
          {Math.abs(deltaPercent).toFixed(0)}%
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
