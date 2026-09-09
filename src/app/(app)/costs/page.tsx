import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CostFilters } from "@/features/costs/components/cost-filters";
import { CostList } from "@/features/costs/components/cost-list";
import {
  COST_PERIODS,
  DEFAULT_COST_KIND,
  DEFAULT_COST_PERIOD,
  type CostKind,
  type CostPeriod,
} from "@/features/costs/domain/cost-entry";
import {
  COSTS_PAGE_SIZE,
  getCosts,
} from "@/features/costs/services/costs.service";
import { formatMoney, pluralize } from "@/lib/format";

export const metadata = { title: "Витрати — Пальне" };
export const dynamic = "force-dynamic";

interface CostsPageProps {
  searchParams: Promise<{
    kind?: string;
    period?: string;
    q?: string;
    take?: string;
  }>;
}

/** Значення з адреси приходять як завгодно — приводимо до відомих. */
function parseKind(raw: string | undefined): CostKind | "all" {
  return raw === "fuel" || raw === "service" ? raw : DEFAULT_COST_KIND;
}

function parsePeriod(raw: string | undefined): CostPeriod {
  return COST_PERIODS.includes(raw as CostPeriod)
    ? (raw as CostPeriod)
    : DEFAULT_COST_PERIOD;
}

function parseTake(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, 500)
    : COSTS_PAGE_SIZE;
}

export default async function CostsPage({ searchParams }: CostsPageProps) {
  const params = await searchParams;

  const kind = parseKind(params.kind);
  const period = parsePeriod(params.period);
  const query = params.q ?? "";
  const take = parseTake(params.take);

  const { entries, matched, hasMore, total } = await getCosts({
    kind,
    period,
    query,
    take,
  });

  const nextParams = new URLSearchParams();
  if (kind !== DEFAULT_COST_KIND) nextParams.set("kind", kind);
  if (period !== DEFAULT_COST_PERIOD) nextParams.set("period", period);
  if (query) nextParams.set("q", query);
  nextParams.set("take", String(take + COSTS_PAGE_SIZE));

  return (
    <main className="flex flex-col gap-5 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Витрати</h1>
        <Button asChild size="sm">
          <Link href="/costs/service/new">
            <Plus aria-hidden />
            ТО
          </Link>
        </Button>
      </header>

      <CostFilters kind={kind} period={period} query={query} />

      {/* Підсумок за всім, що підійшло під фільтр, а не за показаним: інакше
          «разом» змінювалося б від натискання «показати ще». */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {matched}{" "}
          {pluralize(matched, {
            one: "запис",
            few: "записи",
            many: "записів",
          })}
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {formatMoney(total)}
        </span>
      </div>

      <CostList entries={entries} />

      {hasMore ? (
        <Button asChild variant="outline">
          <Link href={`/costs?${nextParams.toString()}`} scroll={false}>
            Показати ще
          </Link>
        </Button>
      ) : null}
    </main>
  );
}
