import { Fuel } from "lucide-react";

import { FuelEntryForm } from "@/features/fuel/components/fuel-entry-form";
import { getFormDefaults } from "@/features/fuel/services/fuel-entries.service";

/**
 * Значення за замовчуванням читаються з бази на кожен запит: ціна має бути
 * саме з останньої заправки, а дата — сьогоднішньою за Києвом. Закешована
 * сторінка показувала б вчорашню дату.
 */
export const dynamic = "force-dynamic";

export default async function FuelEntryPage() {
  const defaults = await getFormDefaults();

  return (
    <main className="flex flex-col gap-6 pt-8">
      <header className="flex items-center gap-3">
        <Fuel className="size-6 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Заправка</h1>
      </header>

      <FuelEntryForm defaults={defaults} />
    </main>
  );
}
