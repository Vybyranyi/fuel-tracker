"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/**
 * Одна серія на графік, тож легенда не потрібна: колір тут нікого ні від кого
 * не відрізняє, а заголовок картки вже каже, що намальовано.
 */
const config = {
  value: { label: "Значення", color: "var(--chart-series)" },
} satisfies ChartConfig;

export interface ChartPoint {
  /** Підпис на осі: «серп.». */
  label: string;
  /** Повна назва місяця — для підказки, де місця більше. */
  fullLabel: string;
  value: number | null;
  /** Готовий текст значення: підказка не має форматувати числа сама. */
  formatted: string;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Чи просив користувач менше руху.
 *
 * Recharts анімує появу на JS, тож `motion-reduce` з Tailwind його не спиняє —
 * доводиться питати систему самому. `useSyncExternalStore` бере на себе і
 * підписку, і серверний рендер: на сервері media-запитів немає, і відповідь
 * там завжди «руху не уникаємо», а після гідратації підхопиться справжня.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED_MOTION);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

const axisNumberFormatter = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 2,
});

/**
 * Підпис поділки осі Y.
 *
 * Тисячі розділяємо так само, як усюди в застосунку: «13 500» проти «13500» —
 * інакше вісь читається інакше, ніж картка просто над нею.
 */
function formatAxisNumber(value: number): string {
  return axisNumberFormatter.format(value);
}

const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

/**
 * Підписи місяців на осі X.
 *
 * `preserveStartEnd` разом із `minTickGap` — щоб перший і останній місяць
 * лишались підписаними завжди: рахувати крок самому означало б раз по раз
 * губити саме останній стовпчик, той, заради якого сюди й заходять.
 */
const X_AXIS_PROPS = {
  dataKey: "label",
  interval: "preserveStartEnd",
  minTickGap: 12,
  ...AXIS_PROPS,
} as const;

function Tooltip() {
  return (
    <ChartTooltip
      cursor={false}
      content={
        <ChartTooltipContent
          hideIndicator
          // `labelKey` тут не спрацював би: він шукає підпис у `config`, а
          // повна назва місяця лежить у самій точці. Тому дістаємо її з
          // корисного навантаження — інакше в підказці лишалось би «серп.».
          labelFormatter={(_label, payload) =>
            (payload?.[0]?.payload as ChartPoint | undefined)?.fullLabel ?? ""
          }
          formatter={(_value, _name, item) => (
            <span className="font-medium tabular-nums">
              {(item.payload as ChartPoint).formatted}
            </span>
          )}
        />
      }
    />
  );
}

/** Помісячні суми — стовпчики від спільної основи. */
export function MonthlyBarChart({ data }: { data: ChartPoint[] }) {
  const animated = !usePrefersReducedMotion();

  return (
    <ChartContainer config={config} className="aspect-[4/3] w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
        {/* Суцільна волосяна сітка, лише горизонтальна: вертикальні лінії між
            стовпчиками нічого не додають, а шуму дають. */}
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis {...X_AXIS_PROPS} />
        {/* width="auto": фіксована ширина обрізала б чотиризначні суми, і
            «13500» перетворювалось на «3500» — гірше, ніж без осі взагалі. */}
        <YAxis
          width="auto"
          tickCount={4}
          tickFormatter={formatAxisNumber}
          {...AXIS_PROPS}
        />
        <Tooltip />
        {/* Заокруглення лише згори: основа стовпчика має лишатись рівною,
            інакше він виглядає відірваним від осі. */}
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={animated}
        />
      </BarChart>
    </ChartContainer>
  );
}

/** Динаміка в часі — лінія з розривами там, де даних немає. */
export function MonthlyLineChart({ data }: { data: ChartPoint[] }) {
  const animated = !usePrefersReducedMotion();

  return (
    <ChartContainer config={config} className="aspect-[4/3] w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis {...X_AXIS_PROPS} />
        <YAxis
          width="auto"
          tickCount={4}
          domain={["auto", "auto"]}
          tickFormatter={formatAxisNumber}
          {...AXIS_PROPS}
        />
        <Tooltip />
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          // Місяць без даних має лишити розрив, а не зʼєднатись прямою через
          // порожнечу: інакше графік показував би витрату, якої не вимірювали.
          connectNulls={false}
          dot={{ r: 4, fill: "var(--color-value)", strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={animated}
        />
      </LineChart>
    </ChartContainer>
  );
}
