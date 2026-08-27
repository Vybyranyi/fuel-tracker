"use client";

import { useAction } from "next-safe-action/hooks";
import { useCallback, useEffect, useState } from "react";

import { signInAction } from "@/features/auth/actions/auth.actions";
import { PinKeypad } from "@/features/auth/components/pin-keypad";
import { PIN_LENGTH } from "@/features/auth/domain/verifier";
import { cn } from "@/lib/utils";

export function PinForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { execute, isPending } = useAction(signInAction, {
    onError({ error: actionError }) {
      // Поле треба звільнити, інакше наступний ввід дописувався б до старого
      // й одразу впирався б у довжину.
      setPin("");
      setError(
        actionError.serverError ??
          actionError.validationErrors?.pin?._errors?.[0] ??
          "Не вдалося увійти",
      );
    },
  });

  const appendDigit = useCallback(
    (digit: string) => {
      if (isPending || pin.length >= PIN_LENGTH) return;

      const next = pin + digit;
      setError(null);
      setPin(next);

      // Автосабміт на останній цифрі: окрема кнопка «Увійти» — зайвий тап
      // там, де намір і так однозначний. Викликаємо тут, а не всередині
      // оновлювача стану: той має лишатись чистою функцією, інакше в dev
      // React виконає його двічі й дія піде двома запитами.
      if (next.length === PIN_LENGTH) execute({ pin: next });
    },
    [pin, execute, isPending],
  );

  const removeDigit = useCallback(() => {
    if (isPending) return;
    setError(null);
    setPin(pin.slice(0, -1));
  }, [pin, isPending]);

  /**
   * Фізична клавіатура теж має працювати — на ноуті тягтись мишею до
   * намальованих кнопок було б безглуздо. Слухаємо вікно, бо фокусувати
   * нічого: жодного поля вводу на сторінці немає.
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key >= "0" && event.key <= "9") {
        appendDigit(event.key);
      } else if (event.key === "Backspace") {
        removeDigit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appendDigit, removeDigit]);

  return (
    <div className="flex flex-col items-center gap-8">
      <div
        className={cn(
          "flex gap-4",
          // Струс замість самого лише тексту: промах видно одразу, ще до того
          // як очі дійдуть до підпису.
          error && "animate-pin-shake",
        )}
        role="status"
        aria-live="polite"
        aria-label={`Введено ${pin.length} з ${PIN_LENGTH} цифр`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            aria-hidden
            className={cn(
              "size-4 rounded-full border-2 transition-colors",
              index < pin.length
                ? "border-foreground bg-foreground"
                : "border-muted-foreground/40",
              error && "border-destructive",
            )}
          />
        ))}
      </div>

      <PinKeypad
        onDigit={appendDigit}
        onBackspace={removeDigit}
        disabled={isPending}
      />

      <p className="min-h-5 text-sm text-destructive" role="alert">
        {isPending ? null : error}
      </p>
    </div>
  );
}
