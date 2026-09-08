import { notFound } from "next/navigation";

import { ServiceRecordForm } from "@/features/service/components/service-record-form";
import {
  getFormDefaults,
  getRecord,
} from "@/features/service/services/service-records.service";

export const metadata = { title: "Зміна ТО — Пальне" };
export const dynamic = "force-dynamic";

export default async function EditServiceRecordPage({
  params,
}: PageProps<"/costs/service/[id]">) {
  const { id } = await params;
  const record = await getRecord(id);

  // `null` приходить і для чужого запису теж: RLS не розрізняє «немає» і «не
  // твоє», і це правильно — інакше по відповіді можна було б дізнатися, що
  // такий запис у когось існує.
  if (!record) notFound();

  return (
    <main className="flex flex-col gap-6 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Зміна запису</h1>
      <ServiceRecordForm
        performedAt={getFormDefaults().performedAt}
        record={record}
      />
    </main>
  );
}
