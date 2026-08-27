"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteFuelEntryAction } from "@/features/fuel/actions/fuel-entries.actions";
import type { FuelEntry } from "@/features/fuel/domain/fuel-entry";
import { formatFullDate, formatLiters, formatMoney } from "@/lib/format";

interface DeleteFuelEntryDialogProps {
  entry: FuelEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteFuelEntryDialog({
  entry,
  open,
  onOpenChange,
}: DeleteFuelEntryDialogProps) {
  const { execute, isPending } = useAction(deleteFuelEntryAction, {
    onSuccess() {
      toast.success("Заправку видалено");
      onOpenChange(false);
    },
    onError({ error }) {
      if (error.serverError) toast.error(error.serverError);
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити заправку?</AlertDialogTitle>
          {/*
            Називаємо конкретний запис, а не «цю заправку»: у списку вони
            схожі між собою, і підтвердження має показувати, який саме зникне.
          */}
          <AlertDialogDescription>
            {formatFullDate(entry.filledAt)} —{" "}
            {formatLiters(entry.volumeLiters)} на {formatMoney(entry.totalCost)}
            . Дію не можна скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              // Діалог не має закриватись сам: закриємо його після відповіді
              // сервера, інакше помилку не було б де показати.
              event.preventDefault();
              execute({ id: entry.id });
            }}
          >
            {isPending ? "Видаляю…" : "Видалити"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
