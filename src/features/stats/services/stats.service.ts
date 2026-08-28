import "server-only";

import {
  buildMonthlyStats,
  totalsOf,
  type MonthlyFuelStats,
  type StatsTotals,
} from "@/features/stats/domain/monthly-stats";
import * as repository from "@/features/stats/repository/stats.repository";

export interface StatsOverview {
  months: MonthlyFuelStats[];
  totals: StatsTotals;
  /** Поточний місяць — його показуємо картками окремо. */
  current: MonthlyFuelStats | null;
  /** Попередній місяць — потрібен, щоб показати зміну. */
  previous: MonthlyFuelStats | null;
}

export async function getStatsOverview(): Promise<StatsOverview> {
  const [rows, points] = await Promise.all([
    repository.aggregateFuelByMonth(),
    repository.listOdometerPoints(),
  ]);

  const months = buildMonthlyStats(rows, points);

  // Останній місяць із заправками, а не календарний поточний: якщо цього
  // місяця ще не заправлялись, картки з нулями не сказали б нічого корисного.
  return {
    months,
    totals: totalsOf(months),
    current: months.at(-1) ?? null,
    previous: months.at(-2) ?? null,
  };
}
