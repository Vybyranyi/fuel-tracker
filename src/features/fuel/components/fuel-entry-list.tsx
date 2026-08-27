"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteFuelEntryDialog } from "@/features/fuel/components/delete-fuel-entry-dialog";
import { EditFuelEntryDialog } from "@/features/fuel/components/edit-fuel-entry-dialog";
import type { FuelEntry } from "@/features/fuel/domain/fuel-entry";
import {
  formatDayMonth,
  formatLiters,
  formatMoney,
  formatPricePerLiter,
} from "@/lib/format";

/** Який діалог відкрито поверх списку. */
type ActiveDialog = { kind: "edit" | "delete"; entry: FuelEntry } | null;

export function FuelEntryList({ entries }: { entries: FuelEntry[] }) {
  const [active, setActive] = useState<ActiveDialog>(null);

  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Заправок ще немає. Перша зʼявиться тут одразу після збереження.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-3 px-3 py-3 first:rounded-t-lg last:rounded-b-lg"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  {formatDayMonth(entry.filledAt)}
                </span>
                {/* Обʼєм і сума — праворуч, моноширинними цифрами: так стовпчик
                    читається згори вниз, а не стрибає від ширини гліфів. */}
                <span className="text-sm tabular-nums">
                  {formatLiters(entry.volumeLiters)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {formatPricePerLiter(entry.pricePerLiter)}
                </span>
                <span className="tabular-nums">
                  {formatMoney(entry.totalCost)}
                </span>
              </div>
              {entry.note ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {entry.note}
                </p>
              ) : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Дії для заправки ${formatDayMonth(entry.filledAt)}`}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => setActive({ kind: "edit", entry })}
                >
                  <Pencil />
                  Редагувати
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setActive({ kind: "delete", entry })}
                >
                  <Trash2 />
                  Видалити
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      {/*
        Діалог живе поза списком і монтується лише під вибраний запис.
        Тримати по два діалоги на кожному рядку означало б десятки прихованих
        форм у розмітці, кожна зі своїм станом react-hook-form.

        `key` змушує форму перестворитись під інший запис: без нього в полях
        лишились би значення попередньо відкритої заправки.
      */}
      {active?.kind === "edit" ? (
        <EditFuelEntryDialog
          key={active.entry.id}
          entry={active.entry}
          open
          onOpenChange={(open) => !open && setActive(null)}
        />
      ) : null}

      {active?.kind === "delete" ? (
        <DeleteFuelEntryDialog
          key={active.entry.id}
          entry={active.entry}
          open
          onOpenChange={(open) => !open && setActive(null)}
        />
      ) : null}
    </>
  );
}
