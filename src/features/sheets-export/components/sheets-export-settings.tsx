"use client";

import { Check, Upload } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { exportMonthAction } from "@/features/sheets-export/actions/sheets-export.actions";
import type { ExportStatus } from "@/features/sheets-export/services/sheets-export.service";
import { formatMonth } from "@/lib/format";
import type { MonthKey } from "@/lib/date";

/**
 * Ручне вивантаження місяця в Google Sheets.
 *
 * Щомісяця це робить крон сам. Кнопки тут потрібні для іншого: добити місяць,
 * який крон пропустив — бо в потрібний день не було ключів, впав Google або
 * заправки внесли заднім числом, уже після першого числа.
 */
export function SheetsExportSettings({ status }: { status: ExportStatus }) {
  // Який саме місяць зараз вивантажується: кнопок кілька, а крутилка має
  // крутитись лише на натиснутій.
  const [running, setRunning] = useState<MonthKey | null>(null);

  const { executeAsync } = useAction(exportMonthAction);

  async function exportMonth(period: MonthKey): Promise<void> {
    setRunning(period);
    try {
      const result = await executeAsync({ period });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      const status = result?.data?.status;

      if (status === "exported") {
        toast.success(`${formatMonth(period)} — рядок додано`);
      } else if (status === "already-exported") {
        // Не помилка: крон міг устигнути першим, поки сторінка була відкрита.
        toast.info(`${formatMonth(period)} вже вивантажено`);
      } else {
        toast.info(`За ${formatMonth(period)} немає заправок`);
      }
    } finally {
      setRunning(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Google Таблиця
      </h2>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        {!status.configured ? (
          <p className="text-xs text-muted-foreground">
            Немає доступів до Google — вивантаження не працюватиме.
          </p>
        ) : status.pending.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 shrink-0" aria-hidden />
            Усі завершені місяці вже в аркуші «{status.tabName}».
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Ще не в аркуші «{status.tabName}». Щомісяця це робиться
              автоматично — кнопки тут, щоб добити пропущене.
            </p>
            <ul className="flex flex-col gap-2">
              {status.pending.map((period) => (
                <li key={period}>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={running !== null}
                    onClick={() => void exportMonth(period)}
                  >
                    <Upload aria-hidden />
                    {running === period
                      ? "Вивантажую…"
                      : `Вивантажити ${formatMonth(period).toLowerCase()}`}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
