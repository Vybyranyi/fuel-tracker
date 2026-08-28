import "server-only";

import webpush from "web-push";

/**
 * Ключі VAPID.
 *
 * Свідомо не в `serverEnvSchema`: ту схему читає ще й `drizzle.config.ts`, і
 * якби ключі лежали там, міграцію не можна було б прогнати, не маючи
 * налаштованих сповіщень.
 *
 * Публічний ключ береться з `NEXT_PUBLIC_…` — того самого, який іде в браузер.
 * Він публічний за визначенням, тож окрема серверна копія лише додала б
 * можливість їм розійтися, а разом із нею — мовчазні відмови push-сервісу.
 */
const SETUP_HINT =
  "Згенеруй ключі: npx web-push generate-vapid-keys — і додай їх у змінні оточення (див. .env.example).";

let configured = false;

export function configureWebPush(): void {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  const missing = [
    !publicKey && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    !privateKey && "VAPID_PRIVATE_KEY",
    !subject && "VAPID_SUBJECT",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Немає змінних для пуш-сповіщень: ${missing.join(", ")}. ${SETUP_HINT}`,
    );
  }

  // `subject` має бути mailto: або https: — push-сервіс відхилить решту.
  webpush.setVapidDetails(subject!, publicKey!, privateKey!);
  configured = true;
}

/** Чи налаштовані сповіщення взагалі — щоб показати це в інтерфейсі. */
export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
}
