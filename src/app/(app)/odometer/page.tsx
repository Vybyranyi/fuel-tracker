import { Gauge } from "lucide-react";

import { OdometerForm } from "@/features/odometer/components/odometer-form";
import { OdometerList } from "@/features/odometer/components/odometer-list";
import {
  getFormDefaults,
  getRecentReadings,
} from "@/features/odometer/services/odometer-readings.service";

/** Дата за замовчуванням — сьогоднішня, тож кешувати сторінку не можна. */
export const dynamic = "force-dynamic";

export default async function OdometerPage() {
  const [defaults, readings] = await Promise.all([
    getFormDefaults(),
    getRecentReadings(),
  ]);

  return (
    <main className="flex flex-col gap-8 pt-8">
      <header className="flex items-center gap-3">
        <Gauge className="size-6 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Пробіг</h1>
      </header>

      <OdometerForm defaults={defaults} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Останні показання
        </h2>
        <OdometerList readings={readings} />
      </section>
    </main>
  );
}
