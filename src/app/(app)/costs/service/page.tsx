import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ServiceRecordList } from "@/features/service/components/service-record-list";
import { getRecentRecords } from "@/features/service/services/service-records.service";

export const metadata = { title: "ТО — Пальне" };
export const dynamic = "force-dynamic";

export default async function ServicePage() {
  const records = await getRecentRecords();

  return (
    <main className="flex flex-col gap-6 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Обслуговування
        </h1>
        <Button asChild size="sm">
          <Link href="/costs/service/new">
            <Plus aria-hidden />
            Додати
          </Link>
        </Button>
      </header>

      <ServiceRecordList records={records} />
    </main>
  );
}
