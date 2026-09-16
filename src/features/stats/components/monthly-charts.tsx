"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/**
 * Односерійні графіки: легенда не потрібна, бо колір тут нікого ні від кого не
 * відрізняє, а заголовок картки вже каже, що намальовано.
 */
const config = {
  value: { label: "Значення", color: "var(--chart-series)" },
} satisfies ChartConfig;

/** Дві серії — і тоді легенда обовʼязкова: сам колір не називає себе. */
const stackedConfig = {
  fuel: { label: "Пальне", color: "var(--chart-series)" },
  service: { label: "ТО", color: "var(--chart-series-2)" },
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

/** Місяць у розрізі двох серій — пальне і ТО. */
export interface StackedPoint {
  label: string;
  fullLabel: string;
  fuel: number;
  service: number;
  fuelFormatted: string;
  serviceFormatted: string;
  totalFormatted: string;
}

/** Просвіт між сегментами стосу — кольором поверхні, а не обведенням. */
const SEGMENT_GAP = 2;
const BAR_RADIUS = 4;

interface SegmentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: StackedPoint;
  /** Серія, що лежить у стосі вище. Немає — значить, сегмент вінчає стовпчик. */
  above?: "service";
}

/**
 * Сегмент складеного стовпчика.
 *
 * Сусідні сегменти розділяє просвіт кольору картки, а не обведення: обведення
 * обвело б фігуру з усіх боків, тоді як розділити треба рівно там, де вони
 * торкаються. Тому просвіт зрізається з верху нижнього сегмента — і лише
 * тоді, коли зверху справді щось лежить, інакше стовпчик місяця без ТО не
 * дотягувався б до власного значення.
 */
function StackSegment({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  payload,
  above,
}: SegmentProps) {
  const covered = above !== undefined && (payload?.[above] ?? 0) > 0;
  const shown = covered ? height - SEGMENT_GAP : height;

  // Нульова серія малює сегмент нульової висоти — його просто немає.
  if (shown <= 0) return null;

  return (
    <Rectangle
      x={x}
      y={covered ? y + SEGMENT_GAP : y}
      width={width}
      height={shown}
      fill={fill}
      // Заокруглення дістається тому сегменту, що вінчає стос: основа
      // стовпчика має лишатись рівною, інакше він виглядає відірваним від осі.
      radius={covered ? 0 : [BAR_RADIUS, BAR_RADIUS, 0, 0]}
    />
  );
}

function StackedTooltip() {
  return (
    <ChartTooltip
      cursor={false}
      content={
        <ChartTooltipContent
          // Підсумок ставимо в рядок заголовка: він стосується всього
          // стовпчика, а не однієї з серій, тож окремим рядком поруч із ними
          // вдавав би третю.
          labelFormatter={(_label, payload) => {
            const point = payload?.[0]?.payload as StackedPoint | undefined;
            return point ? `${point.fullLabel} · ${point.totalFormatted}` : "";
          }}
          formatter={(_value, name, item) => {
            const point = item.payload as StackedPoint;
            const isFuel = name === "fuel";

            return (
              <>
                <span
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{
                    background: isFuel
                      ? "var(--color-fuel)"
                      : "var(--color-service)",
                  }}
                  aria-hidden
                />
                <span className="flex-1 text-muted-foreground">
                  {isFuel
                    ? stackedConfig.fuel.label
                    : stackedConfig.service.label}
                </span>
                <span className="font-medium tabular-nums">
                  {isFuel ? point.fuelFormatted : point.serviceFormatted}
                </span>
              </>
            );
          }}
        />
      }
    />
  );
}

/**
 * Пальне і ТО в одному стовпчику.
 *
 * Складений, а не два ряди поруч: питання тут — «скільки з'їло авто за
 * місяць», і відповідь на нього має бути висотою стовпчика, а не сумою, яку
 * читач складає очима.
 */
export function MonthlyStackedBarChart({ data }: { data: StackedPoint[] }) {
  const animated = !usePrefersReducedMotion();

  return (
    <ChartContainer config={stackedConfig} className="aspect-[4/3] w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis {...X_AXIS_PROPS} />
        <YAxis
          width="auto"
          tickCount={4}
          tickFormatter={formatAxisNumber}
          {...AXIS_PROPS}
        />
        <StackedTooltip />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="fuel"
          stackId="cost"
          fill="var(--color-fuel)"
          maxBarSize={24}
          isAnimationActive={animated}
          shape={(props: SegmentProps) => (
            <StackSegment {...props} above="service" />
          )}
        />
        <Bar
          dataKey="service"
          stackId="cost"
          fill="var(--color-service)"
          maxBarSize={24}
          isAnimationActive={animated}
          shape={(props: SegmentProps) => <StackSegment {...props} />}
        />
      </BarChart>
    </ChartContainer>
  );
}
