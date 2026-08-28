/**
 * Service worker.
 *
 * Свідомо мінімальний: жодного кешування запитів. Обробника `fetch` тут немає
 * взагалі — застосунок працює тільки з живими даними з бази, і закешована
 * сторінка з учорашніми заправками була б гіршою за повідомлення «немає
 * мережі». Єдина причина, чому цей файл існує, — пуш: показати сповіщення
 * браузер може лише через service worker, навіть коли вкладку закрито.
 *
 * Це звичайний файл у `public`, а не зібраний бандл: сюди не можна тягнути
 * імпорти застосунку, бо код виконується поза сторінкою, у власному контексті.
 */

/** Куди вести, якщо в пуші не сказано інакше. */
const DEFAULT_URL = "/odometer";

self.addEventListener("install", () => {
  // Не чекати, поки закриються старі вкладки: застарілий worker тут нічим не
  // кращий за новий, а зайвий цикл оновлення лише відкладає виправлення.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Пуш без корисного навантаження або з поламаним JSON — не привід
    // мовчати: сповіщення все одно треба показати, інакше браузер покаже
    // власне «This site has been updated in the background».
  }

  const title = payload.title || "Пальне";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Один тег на всі нагадування: друге нагадування має замінити перше,
      // а не лягти під ним другим рядком.
      tag: payload.tag || "fuel-tracker",
      data: { url: payload.url || DEFAULT_URL },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    (event.notification.data && event.notification.data.url) || DEFAULT_URL;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Якщо застосунок уже відкритий — переводимо його на потрібну
        // сторінку, а не відкриваємо друге вікно поверх першого.
        for (const client of clients) {
          if ("focus" in client) {
            return client.focus().then((focused) => focused.navigate(url));
          }
        }

        return self.clients.openWindow(url);
      }),
  );
});
