"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { saveOdometerReadingAction } from "@/features/odometer/actions/odometer-readings.actions";
import {
  saveOdometerReadingSchema,
  type OdometerReadingFormValues,
  type SaveOdometerReadingInput,
} from "@/features/odometer/schemas/odometer-reading.schema";
import type { OdometerFormDefaults } from "@/features/odometer/services/odometer-readings.service";
import { formatFullDate, formatKilometers } from "@/lib/format";

export function OdometerForm({ defaults }: { defaults: OdometerFormDefaults }) {
  const [warning, setWarning] = useState<string | null>(null);

  const emptyValues: OdometerReadingFormValues = {
    recordedAt: defaults.recordedAt as string,
    odometerKm: "",
    note: "",
    confirmed: false,
  };

  const form = useForm<
    OdometerReadingFormValues,
    unknown,
    SaveOdometerReadingInput
  >({
    resolver: zodResolver(saveOdometerReadingSchema),
    defaultValues: emptyValues,
  });

  const { execute, isPending } = useAction(saveOdometerReadingAction, {
    onSuccess({ data }) {
      if (data?.status === "needs-confirmation") {
        setWarning(data.warning);
        return;
      }

      setWarning(null);
      form.reset(emptyValues);
      toast.success("Пробіг записано");
    },
    onError({ error }) {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  function submit(confirmed: boolean): void {
    execute({ ...form.getValues(), confirmed });
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={(event) =>
            void form.handleSubmit(() => submit(false))(event)
          }
          className="space-y-5"
        >
          <FormField
            control={form.control}
            name="odometerKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Пробіг</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      inputMode="numeric"
                      placeholder="152340"
                      disabled={isPending}
                      className="h-11 pr-10 text-base tabular-nums"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                    >
                      км
                    </span>
                  </div>
                </FormControl>
                {defaults.latest ? (
                  <FormDescription>
                    Попереднє: {formatKilometers(defaults.latest.odometerKm)} —{" "}
                    {formatFullDate(defaults.latest.recordedAt)}
                  </FormDescription>
                ) : (
                  <FormDescription>Перше показання</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recordedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дата</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    disabled={isPending}
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
                    disabled={isPending}
                    placeholder="Після ТО"
                    className="block h-11 w-full text-base"
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
              "Записати пробіг"
            )}
          </Button>
        </form>
      </Form>

      {/*
        Підозріле показання перепитуємо, а не забороняємо: одометр міг бути
        заміненим, а помилковий запис треба мати змогу виправити вниз.
      */}
      <AlertDialog
        open={warning !== null}
        onOpenChange={(open) => !open && setWarning(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Перевірте показання</AlertDialogTitle>
            <AlertDialogDescription>{warning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Виправити
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                submit(true);
              }}
            >
              Все одно зберегти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
