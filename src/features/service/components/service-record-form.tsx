"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { firstValidationError } from "@/lib/validation-error";
import {
  createServiceRecordAction,
  updateServiceRecordAction,
} from "@/features/service/actions/service-records.actions";
import {
  computeItemAmount,
  SERVICE_ITEM_KINDS,
  SERVICE_ITEM_KIND_LABELS,
  totalOfItems,
  type ServiceItemKind,
  type ServiceRecord,
} from "@/features/service/domain/service-record";
import type { IsoDate } from "@/lib/date";
import { formatDecimalInput, formatMoney } from "@/lib/format";
import { decimal2, parseDecimal2 } from "@/lib/units";

/** Позиція в тому вигляді, у якому її редагують: рядки, як їх набирають. */
interface ItemDraft {
  key: number;
  name: string;
  quantity: string;
  unitPrice: string;
  kind: ServiceItemKind;
}

let nextKey = 0;

function emptyItem(): ItemDraft {
  // Ключ від лічильника, а не від індексу: інакше видалення позиції зі
  // середини зсувало б ключі, і React перевикористав би поля не тим рядкам —
  // текст «переїхав» би між позиціями.
  return {
    key: nextKey++,
    name: "",
    quantity: "1",
    unitPrice: "",
    kind: "part",
  };
}

function toDrafts(record: ServiceRecord | undefined): ItemDraft[] {
  if (!record || record.items.length === 0) return [emptyItem()];

  return record.items.map((item) => ({
    key: nextKey++,
    name: item.name,
    quantity: formatDecimalInput(item.quantity),
    unitPrice: formatDecimalInput(item.unitPrice),
    kind: item.kind,
  }));
}

interface ServiceRecordFormProps {
  performedAt: IsoDate;
  record?: ServiceRecord;
}

export function ServiceRecordForm({
  performedAt,
  record,
}: ServiceRecordFormProps) {
  const [items, setItems] = useState<ItemDraft[]>(() => toDrafts(record));

  const create = useAction(createServiceRecordAction);
  const update = useAction(updateServiceRecordAction);
  const active = record ? update : create;

  function patch(key: number, changes: Partial<ItemDraft>): void {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, ...changes } : item,
      ),
    );
  }

  /**
   * Підсумок рахується поки друкують — тією самою функцією, що й на сервері.
   * Саме він і є причиною тримати позиції у стані: побачити «разом» лише
   * після збереження означало б перевіряти рахунок зі СТО наосліп.
   */
  const total = totalOfItems(
    items.map((item) => ({
      amount: computeItemAmount(
        parseDecimal2(item.quantity) ?? decimal2(0),
        parseDecimal2(item.unitPrice) ?? decimal2(0),
      ),
    })),
  );

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        const input = {
          performedAt: String(data.get("performedAt") ?? ""),
          odometerKm: String(data.get("odometerKm") ?? ""),
          vendor: String(data.get("vendor") ?? ""),
          note: String(data.get("note") ?? ""),
          items: items.map(({ name, quantity, unitPrice, kind }) => ({
            name,
            quantity,
            unitPrice,
            kind,
          })),
        };

        if (record) update.execute({ ...input, id: record.id });
        else create.execute(input);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="performedAt">Дата</Label>
          <Input
            id="performedAt"
            name="performedAt"
            type="date"
            required
            defaultValue={record?.performedAt ?? performedAt}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="odometerKm">Пробіг, км</Label>
          <Input
            id="odometerKm"
            name="odometerKm"
            inputMode="numeric"
            placeholder="—"
            defaultValue={record?.odometerKm ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="vendor">Де робили</Label>
        <Input
          id="vendor"
          name="vendor"
          maxLength={80}
          placeholder="СТО на Пушкінській"
          defaultValue={record?.vendor ?? ""}
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Позиції</h2>
          <span className="text-sm tabular-nums">{formatMoney(total)}</span>
        </div>

        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="flex flex-col gap-2 rounded-xl border bg-card p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`Назва позиції ${index + 1}`}
                  value={item.name}
                  maxLength={80}
                  placeholder="Олива, фільтр, робота…"
                  onChange={(event) =>
                    patch(item.key, { name: event.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Прибрати позицію ${index + 1}`}
                  // Останню не прибираємо: порожній список усе одно не
                  // збережеться, а кнопка «додати» була б єдиним виходом.
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((other) => other.key !== item.key),
                    )
                  }
                >
                  <Trash2 className="text-muted-foreground" aria-hidden />
                </Button>
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  aria-label={`Кількість позиції ${index + 1}`}
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(event) =>
                    patch(item.key, { quantity: event.target.value })
                  }
                />
                <Input
                  aria-label={`Ціна позиції ${index + 1}`}
                  inputMode="decimal"
                  placeholder="₴"
                  value={item.unitPrice}
                  onChange={(event) =>
                    patch(item.key, { unitPrice: event.target.value })
                  }
                />
                <Select
                  value={item.kind}
                  onValueChange={(value) =>
                    patch(item.key, { kind: value as ServiceItemKind })
                  }
                >
                  <SelectTrigger
                    aria-label={`Вид позиції ${index + 1}`}
                    className="w-28"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_ITEM_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {SERVICE_ITEM_KIND_LABELS[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          onClick={() => setItems((current) => [...current, emptyItem()])}
        >
          <Plus aria-hidden />
          Додати позицію
        </Button>
      </section>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Нотатка</Label>
        <Input
          id="note"
          name="note"
          maxLength={280}
          defaultValue={record?.note ?? ""}
        />
      </div>

      <Button type="submit" disabled={active.isPending}>
        <Check aria-hidden />
        {active.isPending ? "Зберігаю…" : "Зберегти"}
      </Button>

      <p className="min-h-5 text-center text-sm text-destructive" role="alert">
        {active.result.serverError ??
          firstValidationError(active.result.validationErrors)}
      </p>
    </form>
  );
}
