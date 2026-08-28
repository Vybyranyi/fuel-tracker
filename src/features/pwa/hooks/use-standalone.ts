"use client";

import { useSyncExternalStore } from "react";

const STANDALONE_QUERY = "(display-mode: standalone)";

/**
 * Чи запущено застосунок з головного екрана.
 *
 * Дві перевірки, бо Safari на iPhone довго не підтримував `display-mode` і має
 * власний прапорець — а саме iPhone тут і цільовий пристрій.
 */
function isStandalone(): boolean {
  if (window.matchMedia(STANDALONE_QUERY).matches) return true;

  const legacy = window.navigator as Navigator & { standalone?: boolean };
  return legacy.standalone === true;
}

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

/**
 * На сервері `matchMedia` не існує, і серверний знімок чесно каже «ні»: так
 * розмітка збігається, а справжнє значення підхоплюється після гідратації.
 */
export function useIsStandalone(): boolean {
  return useSyncExternalStore(subscribe, isStandalone, () => false);
}
