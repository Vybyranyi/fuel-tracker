"use client";

import { Delete } from "lucide-react";

import { Button } from "@/components/ui/button";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

interface PinKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

/**
 * Власна цифрова клавіатура замість системної.
 *
 * Системна клавіатура на айфоні займає пів екрана, зʼїжджає при відкритті й
 * ловить фокус — заради чотирьох цифр це надто багато рухів. Намальовані
 * кнопки завжди на місці, і в них можна дати великі цілі під палець.
 *
 * Наслідок: у розмітці немає жодного `<input>`, тож клавіатурі просто нема
 * куди відкритись. Ввід із фізичної клавіатури форма ловить окремо.
 */
export function PinKeypad({ onDigit, onBackspace, disabled }: PinKeypadProps) {
  return (
    <div className="grid w-full max-w-64 grid-cols-3 gap-3">
      {DIGITS.map((digit) => (
        <Button
          key={digit}
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onDigit(digit)}
          className="h-16 text-2xl font-medium tabular-nums"
        >
          {digit}
        </Button>
      ))}

      {/* Порожня клітинка ліворуч від нуля: так нуль лишається під великим
          пальцем там, де його очікують за звичкою з телефонної клавіатури. */}
      <span aria-hidden />

      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className="h-16 text-2xl font-medium tabular-nums"
      >
        0
      </Button>

      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={onBackspace}
        aria-label="Стерти цифру"
        className="h-16"
      >
        <Delete className="size-6" />
      </Button>
    </div>
  );
}
