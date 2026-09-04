"use client";

import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchCarAction } from "@/features/cars/actions/cars.actions";
import { describeCar, type Car } from "@/features/cars/domain/car";

interface CarSwitcherProps {
  cars: Car[];
  activeId: string;
}

/**
 * Вибір авто в шапці.
 *
 * Одне авто — теж кнопка, а не просто підпис: саме звідси додають друге, і
 * ховати цей шлях, поки авто одне, означало б, що знайти його неможливо.
 */
export function CarSwitcher({ cars, activeId }: CarSwitcherProps) {
  const { execute, isPending } = useAction(switchCarAction);
  const active = cars.find((car) => car.id === activeId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={isPending}
          className="-ml-2 h-11 max-w-full justify-start gap-2 px-2"
        >
          <span className="flex min-w-0 flex-col items-start">
            <span className="truncate text-sm font-medium">
              {active?.name ?? "Авто"}
            </span>
            {active && describeCar(active) ? (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {describeCar(active)}
              </span>
            ) : null}
          </span>
          <ChevronsUpDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">
        {cars.map((car) => (
          <DropdownMenuItem
            key={car.id}
            onSelect={() => {
              // Перемикати на те, що вже відкрите, — зайвий запит і зайве
              // скидання кешу всього застосунку.
              if (car.id !== activeId) execute({ id: car.id });
            }}
          >
            <Check
              className={car.id === activeId ? "opacity-100" : "opacity-0"}
              aria-hidden
            />
            <span className="truncate">{car.name}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/cars/new">
            <Plus aria-hidden />
            Додати авто
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/cars">
            <Settings2 aria-hidden />
            Керувати авто
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
