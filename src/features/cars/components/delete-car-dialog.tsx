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
import { deleteCarAction } from "@/features/cars/actions/cars.actions";
import type { CarContents } from "@/features/cars/domain/car";
import { pluralize } from "@/lib/format";

interface DeleteCarDialogProps {
  car: { id: string; name: string };
  contents: CarContents;
}

/**
 * Видалення авто разом з усією історією.
 *
 * У питанні названо, скільки записів зникне: «Видалити авто?» без цих чисел —
 * питання, на яке неможливо відповісти свідомо, бо за ним може стояти і
 * нічого, і три роки історії.
 */
export function DeleteCarDialog({ car, contents }: DeleteCarDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const { execute, isPending } = useAction(deleteCarAction, {
    onSuccess() {
      setIsOpen(false);
      toast.success(`«${car.name}» видалено`);
      router.refresh();
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Не вдалося видалити");
    },
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Видалити ${car.name}`}>
          <Trash2 className="text-destructive" aria-hidden />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити «{car.name}»?</AlertDialogTitle>
          <AlertDialogDescription>
            {describeLoss(contents)} Це неможливо скасувати.
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
              execute({ id: car.id });
            }}
          >
            {isPending ? "Видаляю…" : "Видалити"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function describeLoss({ fuelEntries, odometerReadings }: CarContents): string {
  const parts: string[] = [];

  if (fuelEntries > 0) {
    parts.push(
      `${fuelEntries} ${pluralize(fuelEntries, {
        one: "заправка",
        few: "заправки",
        many: "заправок",
      })}`,
    );
  }

  if (odometerReadings > 0) {
    parts.push(
      `${odometerReadings} ${pluralize(odometerReadings, {
        one: "показання",
        few: "показання",
        many: "показань",
      })} пробігу`,
    );
  }

  return parts.length === 0
    ? "Записів за цим авто немає."
    : `Разом з авто зникне ${parts.join(" і ")}.`;
}
