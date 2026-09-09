import "server-only";

import { requireCarScope } from "@/features/cars/services/cars.service";
import {
  matchesQuery,
  mergeCosts,
  resolvePeriod,
  totalOfCosts,
  type CostEntry,
  type CostKind,
  type CostPeriod,
} from "@/features/costs/domain/cost-entry";
import * as repository from "@/features/costs/repository/costs.repository";
import { todayInKyiv } from "@/lib/date";
import type { Decimal2 } from "@/lib/units";

/** Скільки записів показуємо за раз, поки не натиснуть «показати ще». */
export const COSTS_PAGE_SIZE = 20;

export interface CostFilters {
  kind: CostKind | "all";
  period: CostPeriod;
  query: string;
  take: number;
}

export interface CostsView {
  /** Записи, обрізані до `take`. */
  entries: CostEntry[];
  /** Скільки всього підійшло під фільтр — і чи є що показувати далі. */
  matched: number;
  hasMore: boolean;
  /** Сума за всім, що підійшло, а не лише за показаним. */
  total: Decimal2;
}

export async function getCosts(filters: CostFilters): Promise<CostsView> {
  const scope = await requireCarScope();
  const range = resolvePeriod(filters.period, todayInKyiv());

  const { fuel, service } = await repository.listCosts(scope, range, {
    fuel: filters.kind !== "service",
    service: filters.kind !== "fuel",
  });

  const matched = mergeCosts(fuel, service).filter((entry) =>
    matchesQuery(entry, filters.query),
  );

  return {
    entries: matched.slice(0, filters.take),
    matched: matched.length,
    hasMore: matched.length > filters.take,
    // Саме за всім, що підійшло: підсумок під фільтром має відповідати
    // фільтру, а не тому, скільки рядків устигли догорнути.
    total: totalOfCosts(matched),
  };
}

/** Останні витрати впереміш — для головної. */
export async function getRecentCosts(limit: number): Promise<CostEntry[]> {
  const scope = await requireCarScope();

  const { fuel, service } = await repository.listCosts(scope, null, {
    fuel: true,
    service: true,
  });

  return mergeCosts(fuel, service).slice(0, limit);
}
