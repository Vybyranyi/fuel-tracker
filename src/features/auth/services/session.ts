import { jwtVerify, SignJWT } from "jose";

import type { AuthMethod } from "@/features/auth/domain/verifier";

/**
 * Робота з сесійною кукою.
 *
 * Свідомо без `server-only`: цей модуль читає middleware, який виконується на
 * Edge. Пакет `server-only` поза контекстом React Server Components кидає
 * виняток, тож тут його немає — а секрет усе одно береться з `process.env`,
 * якого в браузерному бандлі не існує.
 */

export const SESSION_COOKIE_NAME = "fuel_session";

/** Тридцять днів: застосунок відкривають кілька разів на місяць. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const ISSUER = "fuel-tracker";
const AUDIENCE = "fuel-tracker/app";

export interface SessionPayload {
  /** Чим підтверджували цей вхід. Знадобиться, коли зʼявиться Face ID. */
  method: AuthMethod;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SESSION_SECRET має містити щонайменше 32 символи — див. .env.example",
    );
  }

  return new TextEncoder().encode(secret);
}

/** Підписує сесію. Дані всередині не секретні — підпис лише підтверджує вхід. */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ method: payload.method })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Перевіряє підпис і строк дії. Повертає `null` замість винятку: протухла або
 * підроблена кука — це звичайний «не увійшов», а не збій.
 */
export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const method = payload.method;
    return method === "pin" || method === "passkey" ? { method } : null;
  } catch {
    return null;
  }
}

/** Налаштування куки — однакові при вході й при виході. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // На localhost secure-кука не збережеться, тож умова за оточенням.
    secure: process.env.NODE_ENV === "production",
    // `lax`, а не `strict`: інакше перехід за посиланням із пуш-сповіщення
    // відкривав би застосунок так, ніби сесії немає.
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
