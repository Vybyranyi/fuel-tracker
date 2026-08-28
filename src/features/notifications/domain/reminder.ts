import { formatMonth } from "@/lib/format";
import type { MonthKey } from "@/lib/date";

/**
 * Те, що показує service worker.
 *
 * Форма збігається з тим, що читає `public/sw.js`: воно розбирає JSON пуша й
 * бере саме ці поля. Тримати її типом тут — єдиний спосіб не дати серверу й
 * worker'у розійтися, бо між ними немає спільного коду.
 */
export interface NotificationPayload {
  title: string;
  body: string;
  /** Куди вести за натисканням. */
  url: string;
  /**
   * Ключ заміни. Друге нагадування має витіснити перше, а не лягти під ним
   * другим рядком у центрі сповіщень.
   */
  tag: string;
}

/** Нагадування внести пробіг за місяць, що закінчується. */
export function odometerReminder(month: MonthKey): NotificationPayload {
  // «за серпень 2026» — місяць тут у знахідному, який в українській збігається
  // з називним, тож достатньо опустити велику літеру із заголовкової форми.
  const label = formatMonth(month).toLowerCase();

  return {
    title: `Пробіг за ${label}`,
    body: "Місяць закінчується — внеси показання одометра.",
    url: "/odometer",
    // Один тег на всі нагадування про пробіг: якщо минуле не встигли
    // прочитати, нове має його замінити, а не подвоїти.
    tag: "odometer-reminder",
  };
}

/** Сповіщення з кнопки «перевірити»: доводить, що ланцюжок працює цілком. */
export function testNotification(): NotificationPayload {
  return {
    title: "Перевірка звʼязку",
    body: "Сповіщення налаштовані — нагадування про пробіг дійдуть.",
    url: "/settings",
    tag: "test",
  };
}
