import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationPayload } from "@/features/notifications/domain/reminder";

const listSubscriptions = vi.fn();
const deleteSubscription = vi.fn();
const markDelivered = vi.fn();
const markFailed = vi.fn();
const sendNotification = vi.fn();

vi.mock(
  "@/features/notifications/repository/push-subscriptions.repository",
  () => ({
    listSubscriptions: (userId: string) => listSubscriptions(userId),
    deleteSubscription: (userId: string, endpoint: string) =>
      deleteSubscription(userId, endpoint),
    markDelivered: (userId: string, endpoint: string) =>
      markDelivered(userId, endpoint),
    markFailed: (userId: string, endpoint: string) =>
      markFailed(userId, endpoint),
  }),
);

// Ключів VAPID у тесті немає, та вони тут і ні до чого: перевіряємо рішення
// «видалити чи спробувати ще раз», а не саме шифрування.
vi.mock("@/features/notifications/services/vapid", () => ({
  configureWebPush: () => undefined,
  isWebPushConfigured: () => true,
}));

vi.mock("web-push", () => {
  // Сигнатура повторює справжню з @types/web-push: інакше тест компілювався б
  // у vitest (він типів не перевіряє) і падав би аж на `next build`.
  class WebPushError extends Error {
    statusCode: number;

    constructor(
      message: string,
      statusCode: number,
      _headers: Record<string, string>,
      _body: string,
      _endpoint: string,
    ) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  return {
    default: {
      sendNotification: (...args: unknown[]) => sendNotification(...args),
    },
    WebPushError,
  };
});

const { WebPushError } = await import("web-push");
const { sendToUser } =
  await import("@/features/notifications/services/push-sender");

const USER_ID = "11111111-1111-4111-8111-111111111111";

const payload: NotificationPayload = {
  title: "Пробіг за серпень 2026",
  body: "Місяць закінчується — внеси показання одометра.",
  url: "/odometer",
  tag: "odometer-reminder",
};

/** Помилка від push-сервісу. Решта полів коду не цікава, але мають бути. */
const pushError = (endpoint: string, statusCode: number, message: string) =>
  new WebPushError(message, statusCode, {}, "", endpoint);

const gone = (endpoint: string, statusCode: number) =>
  pushError(endpoint, statusCode, "gone");

const subscription = (endpoint: string) => ({
  endpoint,
  p256dh: `p256dh-${endpoint}`,
  auth: `auth-${endpoint}`,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Сервіс пише в лог кожен збій — у виводі тестів це був би шум.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("sendToUser", () => {
  it("без підписок не чіпає push-сервіс", async () => {
    listSubscriptions.mockResolvedValue([]);

    expect(await sendToUser(USER_ID, payload)).toEqual({
      sent: 0,
      removed: 0,
      failed: 0,
    });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("шле всім і позначає доставку", async () => {
    listSubscriptions.mockResolvedValue([
      subscription("https://push/1"),
      subscription("https://push/2"),
    ]);
    sendNotification.mockResolvedValue(undefined);

    expect(await sendToUser(USER_ID, payload)).toEqual({
      sent: 2,
      removed: 0,
      failed: 0,
    });
    expect(markDelivered).toHaveBeenCalledWith(USER_ID, "https://push/1");
    expect(markDelivered).toHaveBeenCalledWith(USER_ID, "https://push/2");
    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it("передає підписку й корисне навантаження у вигляді, який чекає sw.js", async () => {
    listSubscriptions.mockResolvedValue([subscription("https://push/1")]);
    sendNotification.mockResolvedValue(undefined);

    await sendToUser(USER_ID, payload);

    expect(sendNotification).toHaveBeenCalledWith(
      {
        endpoint: "https://push/1",
        keys: { p256dh: "p256dh-https://push/1", auth: "auth-https://push/1" },
      },
      JSON.stringify(payload),
    );
  });

  it.each([404, 410])(
    "видаляє підписку, коли push-сервіс відповів %i",
    async (statusCode) => {
      listSubscriptions.mockResolvedValue([subscription("https://push/dead")]);
      sendNotification.mockRejectedValue(gone("https://push/dead", statusCode));

      expect(await sendToUser(USER_ID, payload)).toEqual({
        sent: 0,
        removed: 1,
        failed: 0,
      });
      expect(deleteSubscription).toHaveBeenCalledWith(
        USER_ID,
        "https://push/dead",
      );
      expect(markFailed).not.toHaveBeenCalled();
    },
  );

  it("тимчасовий збій не видаляє підписку", async () => {
    listSubscriptions.mockResolvedValue([subscription("https://push/flaky")]);
    sendNotification.mockRejectedValue(
      pushError("https://push/flaky", 429, "rate limited"),
    );

    expect(await sendToUser(USER_ID, payload)).toEqual({
      sent: 0,
      removed: 0,
      failed: 1,
    });
    expect(markFailed).toHaveBeenCalledWith(USER_ID, "https://push/flaky");
    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it("обрив мережі теж не видаляє підписку", async () => {
    listSubscriptions.mockResolvedValue([subscription("https://push/flaky")]);
    // Не WebPushError узагалі — статусу немає, отже й підстав викидати немає.
    sendNotification.mockRejectedValue(new Error("socket hang up"));

    expect(await sendToUser(USER_ID, payload)).toEqual({
      sent: 0,
      removed: 0,
      failed: 1,
    });
    expect(markFailed).toHaveBeenCalledWith(USER_ID, "https://push/flaky");
    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it("один мертвий пристрій не зупиняє розсилку на решту", async () => {
    listSubscriptions.mockResolvedValue([
      subscription("https://push/dead"),
      subscription("https://push/alive"),
      subscription("https://push/flaky"),
    ]);
    sendNotification.mockImplementation((sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith("dead")) {
        return Promise.reject(gone(sub.endpoint, 410));
      }
      if (sub.endpoint.endsWith("flaky")) {
        return Promise.reject(new Error("timeout"));
      }
      return Promise.resolve(undefined);
    });

    expect(await sendToUser(USER_ID, payload)).toEqual({
      sent: 1,
      removed: 1,
      failed: 1,
    });
    expect(markDelivered).toHaveBeenCalledWith(USER_ID, "https://push/alive");
    expect(deleteSubscription).toHaveBeenCalledWith(
      USER_ID,
      "https://push/dead",
    );
    expect(markFailed).toHaveBeenCalledWith(USER_ID, "https://push/flaky");
  });

  it("збій бази при відмітці не видається за успіх", async () => {
    listSubscriptions.mockResolvedValue([subscription("https://push/1")]);
    sendNotification.mockResolvedValue(undefined);
    markDelivered.mockRejectedValue(new Error("база недоступна"));

    expect(await sendToUser(USER_ID, payload)).toEqual({
      sent: 0,
      removed: 0,
      failed: 1,
    });
  });
});
