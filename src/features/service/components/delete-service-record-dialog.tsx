"use client";

import { Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteServiceRecordAction } from "@/features/service/actions/service-records.actions";
import { formatDayMonth, formatMoney } from "@/lib/format";
import type { ServiceRecord } from "@/features/service/domain/service-record";

export function DeleteServiceRecordDialog({
  record,
}: {
  record: ServiceRecord;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const { execute, isPending } = useAction(deleteServiceRecordAction, {
    onSuccess() {
      setIsOpen(false);
      toast.success("Запис видалено");
      router.refresh();
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Не вдалося видалити");
    },
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Видалити запис">
          <Trash2 className="text-destructive" aria-hidden />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити запис?</AlertDialogTitle>
          <AlertDialogDescription>
            {formatDayMonth(record.performedAt)},{" "}
            {formatMoney(record.totalCost)}. Позиції зникнуть разом із ним, і це
            неможливо скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              // Інакше діалог закриється сам, ще до відповіді сервера, і про
              // невдале видалення людина дізнається лише з тосту.
              event.preventDefault();
              execute({ id: record.id });
            }}
          >
            {isPending ? "Видаляю…" : "Видалити"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
