"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/features/fuel/components/decimal-input";
import { VolumeStepper } from "@/features/fuel/components/volume-stepper";
import type { FuelEntryFormApi } from "@/features/fuel/hooks/use-fuel-entry-form";
import { parseDecimal2 } from "@/lib/units";

interface FuelEntryFieldsProps extends Omit<FuelEntryFormApi, "resetSource"> {
  disabled?: boolean;
  /** Показувати, звідки взялась ціна: доречно лише при створенні. */
  showPriceOrigin?: boolean;
}

/**
 * Поля заправки — спільні для створення й редагування.
 *
 * Розмітка одна на обидва випадки, тож підписи, порядок і поведінка не
 * розходяться між головним екраном і діалогом редагування.
 */
export function FuelEntryFields({
  form,
  dispatch,
  derivedHint,
  disabled,
  showPriceOrigin,
}: FuelEntryFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="pricePerLiter"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ціна за літр</FormLabel>
            <FormControl>
              <DecimalInput
                suffix="₴/л"
                placeholder="57.99"
                disabled={disabled}
                value={parseDecimal2(field.value)}
                onValueChange={(value) =>
                  dispatch({ type: "price-entered", value })
                }
                onBlur={field.onBlur}
                name={field.name}
              />
            </FormControl>
            {showPriceOrigin ? (
              <FormDescription>
                Підставлена з останньої заправки
              </FormDescription>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="volumeLiters"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Обʼєм</FormLabel>
            <FormControl>
              <DecimalInput
                suffix="л"
                placeholder="0.00"
                disabled={disabled}
                value={parseDecimal2(field.value)}
                onValueChange={(value) =>
                  dispatch({ type: "volume-entered", value })
                }
                onBlur={field.onBlur}
                name={field.name}
              />
            </FormControl>
            <VolumeStepper
              disabled={disabled}
              onStep={(delta) => dispatch({ type: "volume-stepped", delta })}
            />
            {field.value && derivedHint("volumeLiters") ? (
              <FormDescription>{derivedHint("volumeLiters")}</FormDescription>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="totalCost"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Сума</FormLabel>
            <FormControl>
              <DecimalInput
                suffix="₴"
                placeholder="0.00"
                disabled={disabled}
                value={parseDecimal2(field.value)}
                onValueChange={(value) =>
                  dispatch({ type: "total-entered", value })
                }
                onBlur={field.onBlur}
                name={field.name}
              />
            </FormControl>
            {/* Підпис доречний лише тоді, коли є що показувати: під порожнім
                полем «Розраховано» виглядало б як помилка. */}
            {field.value && derivedHint("totalCost") ? (
              <FormDescription>{derivedHint("totalCost")}</FormDescription>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="filledAt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Дата</FormLabel>
            <FormControl>
              {/*
                Нативне поле дати, а не календар із бібліотеки: на айфоні воно
                відкриває звичний системний пікер, зручніший за будь-який
                власний, і не тягне зайвого коду в бандл.

                Без обгортки: `FormControl` — це Slot, він передає id та
                aria-атрибути своїй єдиній дитині. Якби тут був <div>, вони
                осіли б на ньому, і підпис «Дата» перестав би фокусувати поле.
              */}
              <Input
                {...field}
                type="date"
                disabled={disabled}
                className="h-11 w-full max-w-full appearance-none text-base"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Нотатка
              <span className="ml-1 text-muted-foreground">
                — необовʼязково
              </span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                disabled={disabled}
                placeholder="ОККО на трасі"
                className="block h-11 w-full text-base"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
