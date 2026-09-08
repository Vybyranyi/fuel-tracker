import { Pencil, Wrench } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DeleteServiceRecordDialog } from "@/features/service/components/delete-service-record-dialog";
import {
  SERVICE_ITEM_KIND_LABELS,
  splitByKind,
  type ServiceRecord,
} from "@/features/service/domain/service-record";
import {
  formatDayMonth,
  formatDecimal,
  formatKilometers,
  formatMoney,
} from "@/lib/format";
import { decimal2FromNumber } from "@/lib/units";

/** Одна штука — кількість, яку не варто показувати: «1 ×» нічого не додає. */
const SINGLE = decimal2FromNumber(1);

export function ServiceRecordList({ records }: { records: ServiceRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
        <Wrench className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Записів про обслуговування ще немає.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {records.map((record) => {
        const split = splitByKind(record.items);

        return (
          <li
            key={record.id}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4"
          >
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-muted-foreground">
                  {formatDayMonth(record.performedAt)}
                  {record.odometerKm === null
                    ? ""
                    : ` · ${formatKilometers(record.odometerKm)}`}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatMoney(record.totalCost)}
                </span>
                {record.vendor ? (
                  <span className="truncate text-sm">{record.vendor}</span>
                ) : null}
              </div>

              <Button variant="ghost" size="icon" asChild>
                <Link
                  href={`/costs/service/${record.id}`}
                  aria-label="Змінити запис"
                >
                  <Pencil aria-hidden />
                </Link>
              </Button>
              <DeleteServiceRecordDialog record={record} />
            </div>

            <ul className="flex flex-col gap-1 border-t pt-2">
              {record.items.map((item, index) => (
                <li key={index} className="flex items-baseline gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {/* Кількість показуємо, лише коли вона щось означає. */}
                  {item.quantity === SINGLE ? null : (
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDecimal(item.quantity)} ×
                    </span>
                  )}
                  <span className="shrink-0 tabular-nums">
                    {formatMoney(item.amount)}
                  </span>
                </li>
              ))}
            </ul>

            {split.part > 0 && split.labour > 0 ? (
              <p className="text-xs text-muted-foreground">
                {SERVICE_ITEM_KIND_LABELS.part.toLowerCase()}:{" "}
                {formatMoney(split.part)} · {""}
                {SERVICE_ITEM_KIND_LABELS.labour.toLowerCase()}:{" "}
                {formatMoney(split.labour)}
              </p>
            ) : null}

            {record.note ? (
              <p className="text-sm text-muted-foreground">{record.note}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
