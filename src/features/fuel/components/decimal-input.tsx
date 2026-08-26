"use client";

import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDecimalInput } from "@/lib/format";
import { parseDecimal2, type Decimal2 } from "@/lib/units";

interface DecimalInputProps extends Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "type"
> {
  value: Decimal2 | null;
  onValueChange: (value: Decimal2 | null) => void;
  /** Приписка в полі: «л», «₴». */
  suffix?: string;
}

/**
 * Поле для числа з двома знаками після коми.
 *
 * Поки в полі друкують, показуємо рядок як є («40,5»), а не переформатоване
 * значення. Інакше після кожної натиснутої клавіші текст замінювався б на
 * канонічний вигляд, курсор стрибав би в кінець, а стерти щось усередині
 * числа стало б неможливо. Канонічний вигляд («40.50») підставляємо на
 * втраті фокуса — там він нікому не заважає й показує правило двох знаків.
 *
 * Значення ззовні (наприклад, перерахована сума) потрапляє в поле одразу:
 * чернетка існує лише в того поля, у якому зараз друкують.
 */
export function DecimalInput({
  value,
  onValueChange,
  suffix,
  className,
  ...props
}: DecimalInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const displayed = draft ?? (value === null ? "" : formatDecimalInput(value));

  return (
    <div className="relative">
      <Input
        {...props}
        // `text` замість `number`: у number-поля не можна прочитати проміжний
        // ввід («40,») і воно мовчки віддає порожній рядок на кому.
        type="text"
        // Цифрова клавіатура на телефоні з окремою комою.
        inputMode="decimal"
        autoComplete="off"
        value={displayed}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          onValueChange(raw.trim() === "" ? null : parseDecimal2(raw));
        }}
        onFocus={(event) => {
          // Тап по полю на телефоні має відразу давати змогу друкувати нове
          // значення, а не дописувати до наявного.
          event.target.select();
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setDraft(null);
          props.onBlur?.(event);
        }}
        className={cn(
          "h-11 text-base tabular-nums",
          suffix && "pr-10",
          className,
        )}
      />
      {suffix ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
        >
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
