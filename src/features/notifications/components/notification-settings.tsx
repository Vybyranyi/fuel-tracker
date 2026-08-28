"use client";

import { BellRing } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  sendTestNotificationAction,
  subscribeToPushAction,
  unsubscribeFromPushAction,
} from "@/features/notifications/actions/notifications.actions";
import { decodeVapidKey } from "@/features/notifications/domain/vapid-key";
import type { NotificationsStatus } from "@/features/notifications/services/notifications.service";
import { useIsStandalone } from "@/features/pwa/hooks/use-standalone";

/**
 * Стан підписки на цьому пристрої.
 *
 * Саме на цьому: у базі підписок може бути кілька (айфон, ноутбук), а вимикач
 * керує лише тією, що належить цьому браузеру.
 */
type PushState =
  | { kind: "loading" }
  /** Стан не вдалося прочитати — worker не піднявся. */
  | { kind: "unavailable" }
  /** Дозвіл відхилено назавжди — повторно запитати браузер уже не дасть. */
  | { kind: "blocked" }
  | { kind: "off" }
  | { kind: "on"; endpoint: string };

function isSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Підписка не потрібна: набір можливостей браузера за життя вкладки не змінюється. */
const subscribeToNothing = () => () => {};

/**
 * Чи вміє браузер пуш.
 *
 * Це зовнішній факт, а не стан React, тому читається тим самим способом, що й
 * standalone, — а не ефектом, який ставив би state одразу після монтування й
 * тягнув зайвий цикл рендеру. На сервері припускаємо, що вміє: інакше на
 * частку секунди блимало б «не підтримується» на цілком придатному браузері.
 */
function useIsPushSupported(): boolean {
  return useSyncExternalStore(subscribeToNothing, isSupported, () => true);
}

export function NotificationSettings({
  status,
}: {
  status: NotificationsStatus;
}) {
  const [state, setState] = useState<PushState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const standalone = useIsStandalone();
  const supported = useIsPushSupported();

  const subscribeAction = useAction(subscribeToPushAction);
  const unsubscribeAction = useAction(unsubscribeFromPushAction);
  const testAction = useAction(sendTestNotificationAction, {
    onSuccess: () => toast.success("Надіслано — сповіщення от-от прийде"),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Не вдалося надіслати"),
  });

  // Читаємо поточну підписку один раз при появі. Стан ставиться лише в
  // відповіді браузера: синхронно в тілі ефекту його взяти нізвідки, а
  // зайвий цикл рендеру він би дав.
  useEffect(() => {
    if (!supported) return;

    let active = true;

    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!active) return;

        if (Notification.permission === "denied") {
          setState({ kind: "blocked" });
        } else if (subscription) {
          setState({ kind: "on", endpoint: subscription.endpoint });
        } else {
          setState({ kind: "off" });
        }
      })
      .catch((error: unknown) => {
        console.error("Не вдалося прочитати стан підписки", error);
        if (active) setState({ kind: "unavailable" });
      });

    return () => {
      active = false;
    };
  }, [supported]);

  async function enable(): Promise<void> {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      toast.error("Не налаштований публічний ключ VAPID");
      return;
    }

    setBusy(true);
    try {
      // Дозвіл питаємо тільки тут, у відповідь на натискання: iOS ігнорує
      // запит, зроблений без дії користувача, і мовчки відхиляє його.
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState({ kind: permission === "denied" ? "blocked" : "off" });
        toast.error("Дозвіл на сповіщення не надано");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        // Обовʼязково `true`: браузер вимагає, щоб кожен пуш показував
        // сповіщення, і без цього прапорця підписку не видасть.
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey),
      });

      const json = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const result = await subscribeAction.executeAsync({
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent.slice(0, 500),
      });

      if (result?.serverError) {
        // Підписка в браузері вже є, а на сервері її немає — лишати такий
        // розрив не можна: вимикач показував би «увімкнено», а пуш не йшов би.
        await subscription.unsubscribe();
        toast.error(result.serverError);
        setState({ kind: "off" });
        return;
      }

      setState({ kind: "on", endpoint: json.endpoint });
      toast.success("Сповіщення увімкнено");
    } catch (error) {
      console.error("Не вдалося підписатись на сповіщення", error);
      toast.error("Не вдалося увімкнути сповіщення");
    } finally {
      setBusy(false);
    }
  }

  async function disable(): Promise<void> {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;

      await subscription?.unsubscribe();

      // Прибираємо з бази навіть тоді, коли браузер підписки вже не має:
      // інакше мертвий рядок жив би до першої невдалої розсилки.
      if (endpoint) await unsubscribeAction.executeAsync({ endpoint });

      setState({ kind: "off" });
      toast.success("Сповіщення вимкнено");
    } catch (error) {
      console.error("Не вдалося відписатись", error);
      toast.error("Не вдалося вимкнути сповіщення");
    } finally {
      setBusy(false);
    }
  }

  const isOn = state.kind === "on";
  const canToggle =
    status.configured &&
    supported &&
    !busy &&
    (state.kind === "on" || state.kind === "off");

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Сповіщення</h2>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Пояснення сусіднім елементом, а не всередині Label: той у shadcn
              сам по собі flex-рядок, і вкладений блок ліг би збоку від тексту,
              а не під ним. */}
          <div className="flex-1">
            <Label htmlFor="push-toggle">Нагадування про пробіг</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Раз на місяць, в останній день
            </p>
          </div>
          <Switch
            id="push-toggle"
            checked={isOn}
            disabled={!canToggle}
            onCheckedChange={(next) => void (next ? enable() : disable())}
          />
        </div>

        <StatusNote
          state={state}
          status={status}
          standalone={standalone}
          supported={supported}
        />

        {isOn ? (
          <Button
            variant="outline"
            disabled={testAction.isPending}
            onClick={() => testAction.execute()}
          >
            <BellRing aria-hidden />
            {testAction.isPending ? "Надсилаю…" : "Перевірити"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** Один рядок пояснення — той, що зараз доречний. */
function StatusNote({
  state,
  status,
  standalone,
  supported,
}: {
  state: PushState;
  status: NotificationsStatus;
  standalone: boolean;
  supported: boolean;
}) {
  const note = (() => {
    if (!status.configured) {
      return "На сервері немає ключів VAPID — сповіщення не працюватимуть.";
    }
    if (!supported) {
      return "Цей браузер не вміє пуш-сповіщень.";
    }
    if (state.kind === "unavailable") {
      return "Не вдалося прочитати стан підписки. Спробуй перезавантажити сторінку.";
    }
    if (state.kind === "blocked") {
      return "Дозвіл заблоковано. Увімкнути можна лише в налаштуваннях браузера.";
    }
    if (state.kind === "off" && !standalone) {
      // Не блокуємо вимикач: на комп'ютері пуш працює і зі звичайної вкладки.
      // Але на iPhone без головного екрана дозволу не дадуть узагалі.
      return "На iPhone спершу додай застосунок на головний екран — інакше дозволу не буде.";
    }
    if (state.kind === "on") {
      return status.deviceCount > 1
        ? `Підписано пристроїв: ${status.deviceCount}.`
        : "Цей пристрій підписано.";
    }
    return null;
  })();

  if (!note) return null;

  return <p className="text-xs text-muted-foreground">{note}</p>;
}
