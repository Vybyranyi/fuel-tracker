"use client";

import { useEffect } from "react";

/**
 * Реєструє service worker.
 *
 * Нічого не малює — існує тільки заради побічного ефекту, тож і стоїть у
 * кореневому layout: реєстрація має відбутись і на екрані входу теж. iOS
 * підпише пристрій на пуш лише тоді, коли worker уже активний, і чекати з
 * цим до першого відкриття налаштувань немає сенсу.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      // Мовчати тут не можна: без worker'а не буде сповіщень, і це єдине
      // місце, де видно причину.
      console.error("Не вдалося зареєструвати service worker", error);
    });
  }, []);

  return null;
}
