import { Download } from "lucide-react";

import { ExportForm } from "@/features/export/components/export-form";

export const metadata = { title: "Вивантаження — Пальне" };

export default function ExportPage() {
  return (
    <main className="flex flex-col gap-6 pt-6">
      <header className="flex items-center gap-3">
        <Download className="size-6 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Вивантаження</h1>
      </header>

      {/* Яке саме авто вивантажуємо, каже перемикач у шапці — той самий, що й
          на решті сторінок. Другий вибір авто тут означав би два місця, де
          можна вибрати різне, і питання, котре з них головне. */}
      <p className="text-sm text-muted-foreground">
        Заправки й ТО активного авто — у файл, який відкриється в Excel або
        надрукується як є.
      </p>

      <ExportForm />
    </main>
  );
}
