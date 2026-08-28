/**
 * Публічний ключ VAPID у форматі, якого чекає `pushManager.subscribe`.
 *
 * Ключ приходить у base64url — з `-` і `_` замість `+` і `/` та без
 * вирівнювання хвоста. `atob` такого не приймає, тож повертаємо символи на
 * місце й доповнюємо рядок до кратної чотирьом довжини.
 *
 * Винесено окремо саме заради тестів: помилка тут дає не виняток, а мовчазну
 * відмову підписки десь у надрах браузера.
 */
export function decodeVapidKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.padEnd(
    base64Url.length + ((4 - (base64Url.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));

  // Виділяємо буфер явно, а не через `Uint8Array.from`: та повертає
  // `Uint8Array<ArrayBufferLike>`, а `pushManager.subscribe` чекає саме
  // `ArrayBuffer` — з SharedArrayBuffer у сигнатурі типи не сходяться.
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
