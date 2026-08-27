"use client";

import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { updateFuelEntryAction } from "@/features/fuel/actions/fuel-entries.actions";
import { FuelEntryFields } from "@/features/fuel/components/fuel-entry-fields";
import type { FuelEntry } from "@/features/fuel/domain/fuel-entry";
import { useFuelEntryForm } from "@/features/fuel/hooks/use-fuel-entry-form";
import { formatDayMonth, formatDecimalInput } from "@/lib/format";

interface EditFuelEntryDialogProps {
  entry: FuelEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFuelEntryDialog({
  entry,
  open,
  onOpenChange,
}: EditFuelEntryDialogProps) {
  const { form, dispatch, derivedHint } = useFuelEntryForm({
    filledAt: entry.filledAt as string,
    pricePerLiter: formatDecimalInput(entry.pricePerLiter),
    volumeLiters: formatDecimalInput(entry.volumeLiters),
    totalCost: formatDecimalInput(entry.totalCost),
    note: entry.note ?? "",
  });

  const { execute, isPending } = useAction(updateFuelEntryAction, {
    onSuccess() {
      toast.success("Заправку оновлено");
      onOpenChange(false);
    },
    onError({ error }) {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-md"
        // Без цього Radix фокусує перше поле — ціну, яку саме при редагуванні
        // чіпають найрідше. На телефоні це ще й одразу піднімає клавіатуру.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Редагувати заправку</DialogTitle>
          <DialogDescription>
            Від {formatDayMonth(entry.filledAt)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(event) =>
              void form.handleSubmit(() => {
                execute({ id: entry.id, ...form.getValues() });
              })(event)
            }
            className="space-y-5"
          >
            <FuelEntryFields
              form={form}
              dispatch={dispatch}
              derivedHint={derivedHint}
              disabled={isPending}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Скасувати
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Зберігаю…
                  </>
                ) : (
                  "Зберегти"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
