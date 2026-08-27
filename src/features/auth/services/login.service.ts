import "server-only";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";

import {
  describeWait,
  GLOBAL_POLICY,
  GLOBAL_THROTTLE_KEY,
  isLocked,
  PER_IP_POLICY,
  registerFailure,
  registerSuccess,
  remainingLockMs,
  type ThrottlePolicy,
  type ThrottleState,
} from "@/features/auth/domain/throttle";
import * as repository from "@/features/auth/repository/login-attempts.repository";
import { PinVerifier } from "@/features/auth/services/pin-verifier";
import {
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSession,
  verifySession,
} from "@/features/auth/services/session";
import { UserFacingError } from "@/lib/safe-action";

const verifier = new PinVerifier();

/**
 * Ключ лічильника для адреси.
 *
 * Зберігаємо хеш, а не саму адресу: для обмеження темпу достатньо відрізняти
 * адреси між собою, а тримати в базі чиїсь IP — зайва відповідальність.
 * Сіллю править сесійний секрет, тож хеші не піддаються звірянню зі словником.
 */
async function throttleKeyForRequest(): Promise<string> {
  const headerList = await headers();
  // На Verselі реальна адреса — перша в x-forwarded-for.
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded ?? headerList.get("x-real-ip") ?? "unknown";

  return createHash("sha256")
    .update(`${process.env.AUTH_SESSION_SECRET ?? ""}:${address}`)
    .digest("hex");
}

interface Scope {
  key: string;
  policy: ThrottlePolicy;
  state: ThrottleState;
}

async function loadScopes(): Promise<Scope[]> {
  const ipKey = await throttleKeyForRequest();

  const [ipState, globalState] = await Promise.all([
    repository.findThrottleState(ipKey),
    repository.findThrottleState(GLOBAL_THROTTLE_KEY),
  ]);

  return [
    { key: ipKey, policy: PER_IP_POLICY, state: ipState },
    { key: GLOBAL_THROTTLE_KEY, policy: GLOBAL_POLICY, state: globalState },
  ];
}

/**
 * Перевіряє PIN і, якщо він правильний, видає сесійну куку.
 *
 * Кидає `UserFacingError` з текстом, який можна показати як є: причина відмови
 * тут не є секретом, а мовчазне «щось пішло не так» лишило б власника без
 * підказки, скільки ще чекати.
 */
export async function signIn(pin: string): Promise<void> {
  const now = new Date();
  const scopes = await loadScopes();

  const blocked = scopes.find((scope) => isLocked(scope.state, now));
  if (blocked) {
    throw new UserFacingError(
      `Забагато спроб. Спробуйте ${describeWait(remainingLockMs(blocked.state, now))}.`,
    );
  }

  const ok = await verifier.verify(pin);

  if (!ok) {
    await Promise.all(
      scopes.map((scope) =>
        repository.saveThrottleState(
          scope.key,
          registerFailure(scope.state, scope.policy, now),
        ),
      ),
    );
    throw new UserFacingError("Невірний PIN");
  }

  // Успіх обнуляє обидва лічильники — і власний, і глобальний.
  await Promise.all(
    scopes.map((scope) =>
      repository.saveThrottleState(scope.key, registerSuccess()),
    ),
  );

  const token = await signSession({ method: verifier.method });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Чи є дійсна сесія — для серверних компонентів. */
export async function isSignedIn(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return (await verifySession(token)) !== null;
}
