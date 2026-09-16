import "server-only";

import { requireCarScope } from "@/features/cars/services/cars.service";
import {
  buildMonthlyStats,
  totalsOf,
  type MonthlyStats,
  type StatsTotals,
} from "@/features/stats/domain/monthly-stats";
import * as repository from "@/features/stats/repository/stats.repository";

export interface StatsOverview {
  months: MonthlyStats[];
  totals: StatsTotals;
  /** Поточний місяць — його показуємо картками окремо. */
  current: MonthlyStats | null;
  /** Попередній місяць — потрібен, щоб показати зміну. */
  previous: MonthlyStats | null;
}

export async function getStatsOverview(): Promise<StatsOverview> {
  const scope = await requireCarScope();

  const [fuelRows, serviceRows, points] = await Promise.all([
    repository.aggregateFuelByMonth(scope),
    repository.aggregateServiceByMonth(scope),
    repository.listOdometerPoints(scope),
  ]);

  const months = buildMonthlyStats(fuelRows, serviceRows, points);

  // Останній місяць із записами, а не календарний поточний: якщо цього місяця
  // ще нічого не було, картки з нулями не сказали б нічого корисного.
  return {
    months,
    totals: totalsOf(months),
    current: months.at(-1) ?? null,
    previous: months.at(-2) ?? null,
  };
}
