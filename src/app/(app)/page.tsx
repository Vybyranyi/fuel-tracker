import { Fuel } from "lucide-react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { FuelEntryForm } from "@/features/fuel/components/fuel-entry-form";
import { FuelEntryList } from "@/features/fuel/components/fuel-entry-list";
import {
  getFormDefaults,
  getRecentEntries,
} from "@/features/fuel/services/fuel-entries.service";

/**
 * Значення за замовчуванням читаються з бази на кожен запит: ціна має бути
 * саме з останньої заправки, а дата — сьогоднішньою за Києвом. Закешована
 * сторінка показувала б вчорашню дату.
 */
export const dynamic = "force-dynamic";

export default async function FuelEntryPage() {
  // Два незалежні запити — немає причин чекати їх по черзі.
  const [defaults, entries] = await Promise.all([
    getFormDefaults(),
    getRecentEntries(),
  ]);

  return (
    <main className="flex flex-col gap-8 pt-8">
      <header className="flex items-center gap-3">
        <Fuel className="size-6 text-muted-foreground" aria-hidden />
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">
          Заправка
        </h1>
        <SignOutButton />
      </header>

      <FuelEntryForm defaults={defaults} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Останні заправки
        </h2>
        <FuelEntryList entries={entries} />
      </section>
    </main>
  );
}
