"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COST_PERIODS,
  COST_PERIOD_LABELS,
  type CostPeriod,
} from "@/features/costs/domain/cost-entry";
import {
  DEFAULT_EXPORT_REQUEST,
  EXPORT_FORMATS,
  EXPORT_FORMAT_LABELS,
  EXPORT_SECTIONS,
  EXPORT_SECTION_LABELS,
  EXPORT_TOTALS,
  EXPORT_TOTAL_LABELS,
  type ExportFormat,
  type ExportSection,
  type ExportTotal,
} from "@/features/export/domain/export-request";
import { cn } from "@/lib/utils";

/**
 * Перемикач-пігулка.
 *
 * Кнопка з `aria-pressed`, а не чекбокс: на телефоні в цю ціль треба
 * потрапляти пальцем, а квадратик 16×16 поруч із підписом — саме те, у що не
 * потрапляють. Для зчитувача екрана «натиснута кнопка» означає рівно те саме,
 * що «позначено».
 */
function Chip({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition-colors",
        // Вибране заливаємо основним кольором, а не відтінком сірого: на
        // світлій темі ледь сіра пігулка читається радше як «вимкнено», ніж
        // як «вибрано», — а помилитись тут означає завантажити не той файл.
        pressed
          ? "border-transparent bg-primary font-medium text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

/**
 * Назва файлу з відповіді сервера.
 *
 * Вигадувати її в браузері не можна: у ній дата за Києвом, а на телефоні може
 * стояти будь-який часовий пояс — і файл називався б учорашнім числом.
 */
function fileNameFrom(response: Response, fallback: string): string {
  const header = response.headers.get("content-disposition") ?? "";
  return /filename="([^"]+)"/.exec(header)?.[1] ?? fallback;
}

export function ExportForm() {
  const [period, setPeriod] = useState<CostPeriod>(
    DEFAULT_EXPORT_REQUEST.period,
  );
  const [sections, setSections] = useState<ExportSection[]>(
    DEFAULT_EXPORT_REQUEST.sections,
  );
  const [totals, setTotals] = useState<ExportTotal[]>(
    DEFAULT_EXPORT_REQUEST.totals,
  );
  const [format, setFormat] = useState<ExportFormat>(
    DEFAULT_EXPORT_REQUEST.format,
  );
  const [pending, setPending] = useState(false);

  const hasService = sections.includes("service");

  function toggleSection(value: ExportSection): void {
    setSections((current) => {
      const next = toggle(current, value);
      // Позиції — подробиця записів ТО: без самих записів їм нема до чого
      // кріпитись, тож вимикаються разом.
      return value === "service" && !next.includes("service")
        ? next.filter((item) => item !== "items")
        : next;
    });
  }

  async function download(): Promise<void> {
    setPending(true);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ period, sections, totals, format }),
      });

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : "Не вдалося зібрати файл";

        toast.error(message);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileNameFrom(response, `vytraty.${format}`);
      document.body.append(link);
      link.click();
      link.remove();

      // Адресу звільняємо не одразу: у Safari натискання обробляється вже
      // після поточного кадру, і звільнена в тому ж рядку адреса дає порожній
      // файл.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      toast.error("Немає зв'язку з сервером");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Label htmlFor="export-period">Період</Label>
        <Select
          value={period}
          onValueChange={(value) => setPeriod(value as CostPeriod)}
        >
          <SelectTrigger id="export-period" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COST_PERIODS.map((value) => (
              <SelectItem key={value} value={value}>
                {COST_PERIOD_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <Group label="Розділи" hint="Кожен стане окремим аркушем у файлі">
        {EXPORT_SECTIONS.map((value) => (
          <Chip
            key={value}
            pressed={sections.includes(value)}
            disabled={value === "items" && !hasService}
            onClick={() => toggleSection(value)}
          >
            {EXPORT_SECTION_LABELS[value]}
          </Chip>
        ))}
      </Group>

      <Group label="Підсумки" hint="Рахуються за тим, що потрапило у файл">
        {EXPORT_TOTALS.map((value) => (
          <Chip
            key={value}
            pressed={totals.includes(value)}
            onClick={() => setTotals((current) => toggle(current, value))}
          >
            {EXPORT_TOTAL_LABELS[value]}
          </Chip>
        ))}
      </Group>

      <Group label="Формат">
        {EXPORT_FORMATS.map((value) => (
          <Chip
            key={value}
            pressed={format === value}
            onClick={() => setFormat(value)}
          >
            {EXPORT_FORMAT_LABELS[value]}
          </Chip>
        ))}
      </Group>

      <Button
        type="button"
        size="lg"
        disabled={pending || sections.length === 0}
        onClick={() => void download()}
      >
        {pending ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <Download aria-hidden />
        )}
        Завантажити {EXPORT_FORMAT_LABELS[format]}
      </Button>

      {sections.length === 0 ? (
        <p role="alert" className="text-sm text-muted-foreground">
          Виберіть хоча б один розділ — інакше у файлі не буде нічого.
        </p>
      ) : null}
    </div>
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      {/* `group`, а не `<fieldset>`: набір пігулок — це кнопки, і рамка
          fieldset навколо них у Safari додає власні відступи, яких не зняти. */}
      <div role="group" aria-labelledby={`${label}-label`}>
        <p id={`${label}-label`} className="text-sm font-medium">
          {label}
        </p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">{children}</div>
      </div>
    </section>
  );
}
