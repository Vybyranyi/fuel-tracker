import { Fuel, Wrench } from "lucide-react";
import Link from "next/link";

import type { CostEntry } from "@/features/costs/domain/cost-entry";
import {
  formatDayMonth,
  formatLiters,
  formatMoney,
  formatPricePerLiter,
} from "@/lib/format";

/**
 * Спільний список витрат.
 *
 * Заправка й ТО показані по-різному, бо на них дивляться по-різному: у
 * заправці цікавлять літри й ціна, у ТО — за що саме заплатили. Спільна тут
 * лише дата й сума, і саме вони вирівняні в стовпчик.
 */
export function CostList({ entries }: { entries: CostEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        Нічого не знайшлося. Спробуйте інший період або запит.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.id}`}>
          <CostRow entry={entry} />
        </li>
      ))}
    </ul>
  );
}

function CostRow({ entry }: { entry: CostEntry }) {
  const Icon = entry.kind === "fuel" ? Fuel : Wrench;

  const body = (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm">{formatDayMonth(entry.occurredAt)}</span>
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(entry.amount)}
          </span>
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {describe(entry)}
        </span>
      </div>
    </div>
  );

  // Заправку редагують діалогом на головній, тож посилання тут лише в ТО:
  // клікабельний рядок, який нікуди не веде, гірший за неклікабельний.
  return entry.kind === "service" ? (
    <Link href={`/costs/service/${entry.id}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function describe(entry: CostEntry): string {
  if (entry.kind === "fuel") {
    return [
      formatLiters(entry.entry.volumeLiters),
      formatPricePerLiter(entry.entry.pricePerLiter),
      entry.entry.note,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const names = entry.record.items.map((item) => item.name).join(", ");
  return [entry.record.vendor, names].filter(Boolean).join(" · ") || "ТО";
}
