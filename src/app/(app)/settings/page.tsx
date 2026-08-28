import { Settings } from "lucide-react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { getStatus } from "@/features/notifications/services/notifications.service";
import { SheetsExportSettings } from "@/features/sheets-export/components/sheets-export-settings";
import { getExportStatus } from "@/features/sheets-export/services/sheets-export.service";

/** Кількість пристроїв і список невивантажених місяців — з бази на кожен показ. */
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [notifications, sheets] = await Promise.all([
    getStatus(),
    getExportStatus(),
  ]);

  return (
    <main className="flex flex-col gap-8 pt-8">
      <header className="flex items-center gap-3">
        <Settings className="size-6 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Налаштування</h1>
      </header>

      <NotificationSettings status={notifications} />

      <SheetsExportSettings status={sheets} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Доступ</h2>
        <SignOutButton />
      </section>
    </main>
  );
}
