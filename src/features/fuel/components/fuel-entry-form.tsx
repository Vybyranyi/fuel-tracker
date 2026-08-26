"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createFuelEntryAction } from "@/features/fuel/actions/fuel-entries.actions";
import { DecimalInput } from "@/features/fuel/components/decimal-input";
import { VolumeStepper } from "@/features/fuel/components/volume-stepper";
import {
  fuelCalculatorReducer,
  type AmountSource,
  type CalculatorAction,
} from "@/features/fuel/domain/fuel-calculator";
import {
  createFuelEntrySchema,
  type CreateFuelEntryInput,
  type FuelEntryFormValues,
} from "@/features/fuel/schemas/fuel-entry.schema";
import type { FuelEntryFormDefaults } from "@/features/fuel/services/fuel-entries.service";
import { formatDecimalInput } from "@/lib/format";
import { decimal2ToDbString, parseDecimal2 } from "@/lib/units";

/** Поля, які рахує калькулятор. */
const AMOUNT_FIELDS = ["volumeLiters", "pricePerLiter", "totalCost"] as const;

export function FuelEntryForm({
  defaults,
}: {
  defaults: FuelEntryFormDefaults;
}) {
  /**
   * Ведуче поле живе в ref, а не в стані форми: воно нічого не рендерить
   * напряму й не має щоразу перемальовувати всю форму.
   */
  const source = useRef<AmountSource>("volume");

  // Три генерики, бо схема не лише перевіряє, а й перетворює: на вході в неї
  // рядки полів, на виході — вже `Decimal2`. Без третього параметра RHF не
  // може звести тип резолвера з типом значень форми.
  const form = useForm<FuelEntryFormValues, unknown, CreateFuelEntryInput>({
    resolver: zodResolver(createFuelEntrySchema),
    defaultValues: {
      filledAt: defaults.filledAt,
      pricePerLiter:
        defaults.pricePerLiter === null
          ? ""
          : formatDecimalInput(defaults.pricePerLiter),
      volumeLiters: "",
      totalCost: "",
      note: "",
    },
  });

  const { execute, isPending } = useAction(createFuelEntryAction, {
    onSuccess() {
      const keptPrice = form.getValues("pricePerLiter");
      form.reset({
        filledAt: defaults.filledAt,
        // Ціна лишається: наступна заправка майже напевно буде за тією ж.
        pricePerLiter: keptPrice,
        volumeLiters: "",
        totalCost: "",
        note: "",
      });
      source.current = "volume";
      toast.success("Заправку збережено");
    },
    onError({ error }) {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  /**
   * Місток між чистим редюсером і станом форми.
   *
   * Редюсер нічого не знає ні про React, ні про react-hook-form: він отримує
   * три числа, повертає три числа. Тут вони читаються з полів і записуються
   * назад — саме тому логіку перерахунку вдається тестувати без рендера.
   */
  function dispatch(action: CalculatorAction): void {
    const current = form.getValues();
    const next = fuelCalculatorReducer(
      {
        volumeLiters: parseDecimal2(current.volumeLiters),
        pricePerLiter: parseDecimal2(current.pricePerLiter),
        totalCost: parseDecimal2(current.totalCost),
        source: source.current,
      },
      action,
    );

    source.current = next.source;

    for (const field of AMOUNT_FIELDS) {
      const value = next[field];
      const asText = value === null ? "" : decimal2ToDbString(value);
      if (current[field] !== asText) {
        form.setValue(field, asText, {
          shouldValidate: form.formState.isSubmitted,
        });
      }
    }
  }

  /** Підпис під тим полем, яке зараз обчислюється, а не вводиться. */
  const derivedHint = (
    field: "volumeLiters" | "totalCost",
  ): string | undefined =>
    (
      field === "volumeLiters"
        ? source.current === "total"
        : source.current === "volume"
    )
      ? "Розраховано"
      : undefined;

  return (
    <Form {...form}>
      <form
        // handleSubmit повертає проміс; лишати його без нагляду на атрибуті
        // не можна — звідси явний void.
        onSubmit={(event) =>
          void form.handleSubmit(() => {
            execute(form.getValues());
          })(event)
        }
        className="space-y-5"
      >
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
                  value={parseDecimal2(field.value)}
                  onValueChange={(value) =>
                    dispatch({ type: "price-entered", value })
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              {defaults.pricePerLiter !== null ? (
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
                  value={parseDecimal2(field.value)}
                  onValueChange={(value) =>
                    dispatch({ type: "volume-entered", value })
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <VolumeStepper
                disabled={isPending}
                onStep={(delta) => dispatch({ type: "volume-stepped", delta })}
              />
              {derivedHint("volumeLiters") ? (
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
                  value={parseDecimal2(field.value)}
                  onValueChange={(value) =>
                    dispatch({ type: "total-entered", value })
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              {derivedHint("totalCost") ? (
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
                  Нативне поле дати, а не календар із бібліотеки: на айфоні
                  воно відкриває звичний системний пікер, який зручніший за
                  будь-який власний, і не тягне зайвого коду в бандл.
                */}
                <Input {...field} type="date" className="h-11 text-base" />
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
                  placeholder="ОККО на трасі"
                  className="h-11 text-base"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 w-full text-base"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Зберігаю…
            </>
          ) : (
            "Зберегти заправку"
          )}
        </Button>
      </form>
    </Form>
  );
}
