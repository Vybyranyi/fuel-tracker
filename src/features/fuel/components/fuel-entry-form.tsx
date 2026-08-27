"use client";

import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { createFuelEntryAction } from "@/features/fuel/actions/fuel-entries.actions";
import { FuelEntryFields } from "@/features/fuel/components/fuel-entry-fields";
import { useFuelEntryForm } from "@/features/fuel/hooks/use-fuel-entry-form";
import type { FuelEntryFormDefaults } from "@/features/fuel/services/fuel-entries.service";
import { formatDecimalInput } from "@/lib/format";

export function FuelEntryForm({
  defaults,
}: {
  defaults: FuelEntryFormDefaults;
}) {
  const emptyValues = {
    filledAt: defaults.filledAt as string,
    pricePerLiter:
      defaults.pricePerLiter === null
        ? ""
        : formatDecimalInput(defaults.pricePerLiter),
    volumeLiters: "",
    totalCost: "",
    note: "",
  };

  const { form, dispatch, derivedHint, resetSource } =
    useFuelEntryForm(emptyValues);

  const { execute, isPending } = useAction(createFuelEntryAction, {
    onSuccess() {
      form.reset({
        ...emptyValues,
        // Ціна лишається такою, як її щойно ввели: наступна заправка майже
        // напевно буде за тією ж, і вводити її вдруге — зайва робота.
        pricePerLiter: form.getValues("pricePerLiter"),
      });
      resetSource();
      toast.success("Заправку збережено");
    },
    onError({ error }) {
      if (error.serverError) toast.error(error.serverError);
    },
  });

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
        <FuelEntryFields
          form={form}
          dispatch={dispatch}
          derivedHint={derivedHint}
          disabled={isPending}
          showPriceOrigin={defaults.pricePerLiter !== null}
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
