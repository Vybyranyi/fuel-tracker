"use client";

import { Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteOdometerReadingAction } from "@/features/odometer/actions/odometer-readings.actions";
import {
  distanceBetween,
  type OdometerReading,
} from "@/features/odometer/domain/odometer-reading";
import { formatFullDate, formatKilometers } from "@/lib/format";

export function OdometerList({ readings }: { readings: OdometerReading[] }) {
  const [pendingDelete, setPendingDelete] = useState<OdometerReading | null>(
    null,
  );

  const { execute, isPending } = useAction(deleteOdometerReadingAction, {
    onSuccess() {
      toast.success("Показання видалено");
      setPendingDelete(null);
    },
    onError({ error }) {
      if (error.serverError) toast.error(error.serverError);
      setPendingDelete(null);
    },
  });

  if (readings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Показань ще немає. Запиши поточний пробіг — далі буде видно, скільки
        накатано за місяць.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {readings.map((reading, index) => {
          // Список іде від найновішого, тож попереднє за часом — наступний
          // елемент масиву. Різниця показує, скільки проїхано між записами.
          const previous = readings[index + 1] ?? null;
          const distance = distanceBetween(previous, reading);

          return (
            <li key={reading.id} className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {formatKilometers(reading.odometerKm)}
                  </span>
                  {distance !== null ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      +{formatKilometers(distance)}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFullDate(reading.recordedAt)}
                </p>
                {reading.note ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {reading.note}
                  </p>
                ) : null}
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label={`Видалити показання за ${formatFullDate(reading.recordedAt)}`}
                onClick={() => setPendingDelete(reading)}
              >
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити показання?</AlertDialogTitle>
            <AlertDialogDescription>
              {/* Дата перед пробігом, а не після: `formatFullDate` уже
                  закінчується на «р.», і крапка речення дала б дві поспіль. */}
              {pendingDelete
                ? `${formatFullDate(pendingDelete.recordedAt)} — ${formatKilometers(pendingDelete.odometerKm)}. Дію не можна скасувати.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Скасувати
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) execute({ id: pendingDelete.id });
              }}
            >
              {isPending ? "Видаляю…" : "Видалити"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
