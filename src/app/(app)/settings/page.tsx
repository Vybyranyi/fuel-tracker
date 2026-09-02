import { Settings } from "lucide-react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { getStatus } from "@/features/notifications/services/notifications.service";

/** Кількість підписаних пристроїв читається з бази на кожен показ. */
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const notifications = await getStatus();

  return (
    <main className="flex flex-col gap-8 pt-8">
      <header className="flex items-center gap-3">
        <Settings className="size-6 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Налаштування</h1>
      </header>

      <NotificationSettings status={notifications} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Доступ</h2>
        <SignOutButton />
      </section>
    </main>
  );
}
