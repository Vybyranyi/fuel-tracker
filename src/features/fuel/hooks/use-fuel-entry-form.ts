"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

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
import { decimal2ToDbString, parseDecimal2 } from "@/lib/units";

/** Поля, які перераховує калькулятор. */
const AMOUNT_FIELDS = ["volumeLiters", "pricePerLiter", "totalCost"] as const;

export type FuelEntryForm = UseFormReturn<
  FuelEntryFormValues,
  unknown,
  CreateFuelEntryInput
>;

export interface FuelEntryFormApi {
  form: FuelEntryForm;
  /** Надсилає дію калькулятору й розкладає результат по полях. */
  dispatch: (action: CalculatorAction) => void;
  /** Підпис «Розраховано» — під тим полем, яке зараз похідне. */
  derivedHint: (field: "volumeLiters" | "totalCost") => string | undefined;
  /** Скидає позначку ведучого поля — після збереження або скидання форми. */
  resetSource: () => void;
}

/**
 * Спільна основа для створення й редагування заправки.
 *
 * Обидві форми — та, що під формою на головній, і та, що в діалозі
 * редагування — мають однакову поведінку трьох повʼязаних полів. Тримати її
 * в одному місці означає, що правило перерахунку не почне тихо розходитись
 * між двома копіями.
 */
export function useFuelEntryForm(
  defaultValues: FuelEntryFormValues,
): FuelEntryFormApi {
  /**
   * Ведуче поле живе в ref, а не в стані: воно нічого не рендерить саме по
   * собі й не має причин перемальовувати форму на кожне натискання клавіші.
   */
  const source = useRef<AmountSource>("volume");

  // Три генерики, бо схема не лише перевіряє, а й перетворює: на вході рядки
  // полів, на виході — вже `Decimal2`. Без третього параметра react-hook-form
  // не зводить тип резолвера з типом значень форми.
  const form = useForm<FuelEntryFormValues, unknown, CreateFuelEntryInput>({
    resolver: zodResolver(createFuelEntrySchema),
    defaultValues,
  });

  /**
   * Місток між чистим редюсером і станом форми.
   *
   * Редюсер не знає ні про React, ні про react-hook-form: отримує три числа,
   * повертає три числа. Тут вони читаються з полів і записуються назад — саме
   * тому логіку перерахунку вдається тестувати без жодного рендера.
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

  function derivedHint(
    field: "volumeLiters" | "totalCost",
  ): string | undefined {
    const isDerived =
      field === "volumeLiters"
        ? source.current === "total"
        : source.current === "volume";
    return isDerived ? "Розраховано" : undefined;
  }

  return {
    form,
    dispatch,
    derivedHint,
    resetSource: () => {
      source.current = "volume";
    },
  };
}
