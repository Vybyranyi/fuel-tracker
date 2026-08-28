import { ChartColumn } from "lucide-react";

import {
  MonthlyBarChart,
  MonthlyLineChart,
  type ChartPoint,
} from "@/features/stats/components/monthly-charts";
import { MonthlyTable } from "@/features/stats/components/monthly-table";
import { StatTile } from "@/features/stats/components/stat-tile";
import {
  percentChange,
  type MonthlyFuelStats,
} from "@/features/stats/domain/monthly-stats";
import type { StatsOverview } from "@/features/stats/services/stats.service";
import {
  formatConsumption,
  formatKilometers,
  formatLiters,
  formatMoney,
  formatMonth,
  formatMonthShort,
  formatPricePerLiter,
  pluralize,
} from "@/lib/format";
import { decimal2ToNumber, type Decimal2 } from "@/lib/units";

/** Нижче двох місяців вісь часу нема що показувати — лишаються картки й таблиця. */
const MIN_MONTHS_FOR_CHART = 2;

/**
 * Один ряд для графіка.
 *
 * Форматований текст кладемо поруч зі значенням, а не форматуємо в підказці:
 * так усі числа на сторінці проходять через ті самі функції з `lib/format`, і
 * підпис у підказці не може розійтися з таблицею під графіком.
 */
function toPoints(
  months: readonly MonthlyFuelStats[],
  pick: (month: MonthlyFuelStats) => Decimal2 | null,
  format: (value: Decimal2) => string,
): ChartPoint[] {
  return months.map((month) => {
    const value = pick(month);

    return {
      label: formatMonthShort(month.month),
      fullLabel: formatMonth(month.month),
      value: value === null ? null : decimal2ToNumber(value),
      formatted: value === null ? "—" : format(value),
    };
  });
}

/**
 * Сторінка статистики без походу в базу.
 *
 * Дані приходять аргументом, а не читаються тут: так усю верстку — і порожній
 * стан, і місяць з одним записом, і довгий ряд — видно на вигаданих числах,
 * не заводячи їх у справжню базу.
 */
export function StatsView({ overview }: { overview: StatsOverview }) {
  const { months, totals, current, previous } = overview;

  if (!current) {
    return (
      <main className="flex flex-col gap-8 pt-8">
        <Header />
        <p className="text-sm text-muted-foreground">
          Поки що немає жодної заправки. Статистика зʼявиться після першого
          запису.
        </p>
      </main>
    );
  }

  const hasCharts = months.length >= MIN_MONTHS_FOR_CHART;
  // Графік витрати малюємо лише тоді, коли пробіг відомий бодай за один
  // місяць: порожні осі нічого не пояснюють, а місце займають.
  const hasConsumption = months.some(
    (month) => month.consumptionPer100Km !== null,
  );

  return (
    <main className="flex flex-col gap-8 pt-8">
      <Header />

      <section className="flex flex-col gap-3">
        {/* Заголовок називає базу порівняння один раз — щоб стрілки на
            картках лишились самими стрілками з числом. Назву попереднього
            місяця свідомо не підставляємо: у заголовку вона стала б у
            називному відмінку («проти липень»), а правити відмінки заради
            одного рядка не варте того. */}
        <h2 className="text-sm font-medium text-muted-foreground">
          {formatMonth(current.month)}
          {previous ? " · зміни до попереднього місяця" : ""}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Витрачено"
            value={formatMoney(current.totalCost)}
            deltaPercent={percentChange(
              current.totalCost,
              previous?.totalCost ?? null,
            )}
            upIsGood={false}
          />
          <StatTile
            label="Залито"
            value={formatLiters(current.liters)}
            deltaPercent={percentChange(
              current.liters,
              previous?.liters ?? null,
            )}
          />
          <StatTile
            label="Середня ціна"
            value={
              current.averagePricePerLiter
                ? formatPricePerLiter(current.averagePricePerLiter)
                : "—"
            }
            deltaPercent={percentChange(
              current.averagePricePerLiter,
              previous?.averagePricePerLiter ?? null,
            )}
            upIsGood={false}
          />
          <StatTile
            label="Витрата"
            value={
              current.consumptionPer100Km
                ? formatConsumption(current.consumptionPer100Km)
                : "—"
            }
            deltaPercent={percentChange(
              current.consumptionPer100Km,
              previous?.consumptionPer100Km ?? null,
            )}
            upIsGood={false}
            hint={current.consumptionPer100Km ? undefined : "немає показань"}
          />
          <StatTile label="Заправок" value={String(current.fillCount)} />
          <StatTile
            label="Пробіг"
            value={
              current.distanceKm === null
                ? "—"
                : formatKilometers(current.distanceKm)
            }
          />
        </div>
      </section>

      {hasCharts ? (
        <section className="flex flex-col gap-6">
          <ChartCard title="Витрати по місяцях">
            <MonthlyBarChart
              data={toPoints(months, (month) => month.totalCost, formatMoney)}
            />
          </ChartCard>

          <ChartCard title="Літри по місяцях">
            <MonthlyBarChart
              data={toPoints(months, (month) => month.liters, formatLiters)}
            />
          </ChartCard>

          <ChartCard title="Ціна за літр">
            <MonthlyLineChart
              data={toPoints(
                months,
                (month) => month.averagePricePerLiter,
                formatPricePerLiter,
              )}
            />
          </ChartCard>

          {hasConsumption ? (
            <ChartCard title="Витрата, л/100 км">
              <MonthlyLineChart
                data={toPoints(
                  months,
                  (month) => month.consumptionPer100Km,
                  formatConsumption,
                )}
              />
            </ChartCard>
          ) : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Помісячно</h2>
        <MonthlyTable months={months} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          За весь час
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Витрачено"
            value={formatMoney(totals.totalCost)}
            hint={`${totals.fillCount} ${pluralize(totals.fillCount, {
              one: "заправка",
              few: "заправки",
              many: "заправок",
            })}`}
          />
          <StatTile label="Залито" value={formatLiters(totals.liters)} />
          <StatTile
            label="Середня ціна"
            value={
              totals.averagePricePerLiter
                ? formatPricePerLiter(totals.averagePricePerLiter)
                : "—"
            }
          />
          <StatTile
            label="Пробіг"
            value={
              totals.distanceKm === null
                ? "—"
                : formatKilometers(totals.distanceKm)
            }
            hint={totals.distanceKm === null ? "немає показань" : undefined}
          />
          <StatTile
            label="Витрата"
            value={
              totals.consumptionPer100Km
                ? formatConsumption(totals.consumptionPer100Km)
                : "—"
            }
          />
          <StatTile
            label="Вартість кілометра"
            value={totals.costPerKm ? formatMoney(totals.costPerKm) : "—"}
          />
        </div>
      </section>
    </main>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-3">
      <ChartColumn className="size-6 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">Статистика</h1>
    </header>
  );
}

/**
 * Обгортка графіка.
 *
 * Заголовок картки — єдине, що називає серію: легенди тут нема свідомо, бо
 * серія одна й колір нікого ні від кого не відрізняє.
 */
function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
