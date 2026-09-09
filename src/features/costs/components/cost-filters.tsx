"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COST_KIND_LABELS,
  COST_PERIODS,
  COST_PERIOD_LABELS,
  DEFAULT_COST_KIND,
  DEFAULT_COST_PERIOD,
  type CostKind,
  type CostPeriod,
} from "@/features/costs/domain/cost-entry";
import { cn } from "@/lib/utils";

const KINDS = ["all", "fuel", "service"] as const satisfies readonly (
  CostKind | "all"
)[];

interface CostFiltersProps {
  kind: CostKind | "all";
  period: CostPeriod;
  query: string;
}

/**
 * Панель фільтрів.
 *
 * Стан живе в адресі, а не в компоненті: так відфільтрований список можна
 * зберегти в закладки й перезавантажити, а кнопка «назад» повертає до
 * попереднього фільтра, а не викидає зі сторінки.
 */
export function CostFilters({ kind, period, query }: CostFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [draft, setDraft] = useState(query);

  /**
   * Дописує параметр в адресу — або прибирає, якщо він і так за замовчуванням.
   *
   * Порівнюємо саме з дефолтом цього параметра, а не з рядком «all»: у
   * періоду теж є значення «all» («увесь час»), і прибирання його з адреси
   * мовчки повертало б на «3 місяці» — вибір, який людина щойно скасувала.
   */
  function withParam(name: string, value: string, fallback: string): string {
    const next = new URLSearchParams(params);

    if (value === "" || value === fallback) next.delete(name);
    else next.set(name, value);

    // Будь-яка зміна фільтра починає гортання спочатку: лишити `take` від
    // попереднього фільтра означало б показати сорок рядків там, де їх п'ять.
    next.delete("take");

    const search = next.toString();
    return search ? `${pathname}?${search}` : pathname;
  }

  /**
   * Пошук їде в адресу з паузою.
   *
   * Без неї кожна натиснута клавіша була б окремим переходом і окремим
   * запитом до бази — а на телефоні ще й помітним підгальмовуванням.
   */
  useEffect(() => {
    if (draft === query) return;

    const timer = setTimeout(() => {
      router.replace(withParam("q", draft, ""), { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-lg border p-1">
        {KINDS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() =>
              router.replace(withParam("kind", value, DEFAULT_COST_KIND))
            }
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm transition-colors",
              kind === value
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {COST_KIND_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Select
          value={period}
          onValueChange={(value) =>
            router.replace(withParam("period", value, DEFAULT_COST_PERIOD))
          }
        >
          <SelectTrigger aria-label="Період" className="w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COST_PERIODS.map((value) => (
              <SelectItem key={value} value={value}>
                {COST_PERIOD_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Пошук"
            placeholder="Нотатка, СТО…"
            className="pl-9"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
