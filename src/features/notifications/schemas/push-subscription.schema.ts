import { z } from "zod";

/**
 * Підписка так, як її віддає браузер (`subscription.toJSON()`).
 *
 * Ключі приходять у base64url і на сервері нікуди не розбираються — їх просто
 * передають далі в `web-push`. Тому перевіряємо лише те, що вони є: вигадувати
 * тут власний розбір криптографії означало б повторити бібліотеку й помилитись.
 */
export const savePushSubscriptionSchema = z.object({
  endpoint: z.url({ error: "Очікується адреса push-сервісу" }),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  // Щоб у базі було видно, з якого пристрою підписка: їх може бути кілька.
  userAgent: z.string().max(500).optional(),
});

export type SavePushSubscriptionInput = z.infer<
  typeof savePushSubscriptionSchema
>;

export const removePushSubscriptionSchema = z.object({
  endpoint: z.url(),
});
