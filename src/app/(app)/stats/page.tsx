import { StatsView } from "@/features/stats/components/stats-view";
import { getStatsOverview } from "@/features/stats/services/stats.service";

/** Статистика читає всі заправки, тож кешувати сторінку не можна. */
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  return <StatsView overview={await getStatsOverview()} />;
}
