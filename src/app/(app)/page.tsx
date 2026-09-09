import { Fuel } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CostList } from "@/features/costs/components/cost-list";
import { getRecentCosts } from "@/features/costs/services/costs.service";
import { FuelEntryForm } from "@/features/fuel/components/fuel-entry-form";
import { getFormDefaults } from "@/features/fuel/services/fuel-entries.service";
import { InstallHint } from "@/features/pwa/components/install-hint";

/**
 * Значення за замовчуванням читаються з бази на кожен запит: ціна має бути
 * саме з останньої заправки, а дата — сьогоднішньою за Києвом. Закешована
 * сторінка показувала б вчорашню дату.
 */
export const dynamic = "force-dynamic";

/**
 * Скільки останніх записів показуємо під формою.
 *
 * П'ять, а не десять: тут вони потрібні лише щоб побачити, що заправка
 * збереглася, і згадати попередню ціну. Дивитись історію ходять у «Витрати».
 */
const RECENT_LIMIT = 5;

export default async function FuelEntryPage() {
  // Два незалежні запити — немає причин чекати їх по черзі.
  const [defaults, recent] = await Promise.all([
    getFormDefaults(),
    getRecentCosts(RECENT_LIMIT),
  ]);

  return (
    <main className="flex flex-col gap-8 pt-6">
      <header className="flex items-center gap-3">
        <Fuel className="size-6 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Заправка</h1>
      </header>

      <FuelEntryForm defaults={defaults} />

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Останні витрати
          </h2>
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link href="/costs">Усі</Link>
          </Button>
        </div>

        <CostList entries={recent} />
      </section>

      {/* Внизу, а не над формою: внести заправку важливіше, ніж встановити
          застосунок, і підказка не має відсувати головну дію. */}
      <InstallHint />
    </main>
  );
}
