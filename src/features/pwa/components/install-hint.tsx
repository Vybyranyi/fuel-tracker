"use client";

import { Share, X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useIsStandalone } from "@/features/pwa/hooks/use-standalone";

const DISMISSED_KEY = "fuel-tracker:install-hint-dismissed";

/**
 * `localStorage` про свої зміни в тій самій вкладці не повідомляє, тож
 * тримаємо власний список слухачів — інакше підказка не зникала б після
 * натискання на хрестик аж до перезавантаження.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Приватний режим може заборонити сховище — тоді показуємо.
    return false;
  }
}

function dismiss(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Не змогли запамʼятати — підказка повернеться наступного разу. Це
    // прикро, але не привід ламати натискання.
  }
  for (const listener of listeners) listener();
}

/**
 * Підказка «додай на головний екран».
 *
 * Показується, поки застосунок відкривають як звичайну сторінку. Це не просто
 * про зручність: на iPhone пуш-сповіщення працюють винятково для застосунку з
 * головного екрана, тож без цього кроку нагадування про пробіг не прийде.
 */
export function InstallHint() {
  const standalone = useIsStandalone();
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);

  if (standalone || dismissed) return null;

  return (
    <aside className="flex gap-3 rounded-xl border bg-card p-4">
      <Share
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        aria-hidden
      />

      <div className="flex-1">
        <p className="text-sm font-medium">Додай на головний екран</p>
        <p className="mt-1 text-sm text-muted-foreground">
          У Safari: «Поділитися» → «На Домашній екран». Інакше iPhone не
          пропустить нагадування про пробіг.
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="-mt-1 -mr-1 shrink-0"
        onClick={dismiss}
        aria-label="Сховати підказку"
      >
        <X className="size-4" aria-hidden />
      </Button>
    </aside>
  );
}
