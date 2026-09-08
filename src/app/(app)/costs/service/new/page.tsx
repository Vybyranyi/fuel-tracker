import { ServiceRecordForm } from "@/features/service/components/service-record-form";
import { getFormDefaults } from "@/features/service/services/service-records.service";

export const metadata = { title: "Нове ТО — Пальне" };
export const dynamic = "force-dynamic";

export default function NewServiceRecordPage() {
  const { performedAt } = getFormDefaults();

  return (
    <main className="flex flex-col gap-6 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Нове ТО</h1>
      <ServiceRecordForm performedAt={performedAt} />
    </main>
  );
}
