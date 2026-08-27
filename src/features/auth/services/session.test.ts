import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { signSession, verifySession } from "@/features/auth/services/session";

const SECRET = "тестовий-секрет-щонайменше-32-символи-довжиною";
const original = process.env.AUTH_SESSION_SECRET;

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = SECRET;
});

afterEach(() => {
  process.env.AUTH_SESSION_SECRET = original;
});

describe("сесійна кука", () => {
  it("переживає обіг підпис → перевірка", async () => {
    const token = await signSession({ method: "pin" });
    await expect(verifySession(token)).resolves.toEqual({ method: "pin" });
  });

  it("відсутню куку вважає «не увійшов», а не помилкою", async () => {
    await expect(verifySession(undefined)).resolves.toBeNull();
    await expect(verifySession("")).resolves.toBeNull();
  });

  it("відхиляє сміття замість токена", async () => {
    await expect(verifySession("не.токен.зовсім")).resolves.toBeNull();
  });

  it("відхиляє токен, підписаний іншим секретом", async () => {
    // Саме це відділяє справжню сесію від підробленої: без перевірки підпису
    // будь-хто виставив би собі куку вручну й зайшов.
    const foreign = await new SignJWT({ method: "pin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("fuel-tracker")
      .setAudience("fuel-tracker/app")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("зовсім-інший-секрет-теж-довгий-рядок"));

    await expect(verifySession(foreign)).resolves.toBeNull();
  });

  it("відхиляє прострочений токен", async () => {
    const expired = await new SignJWT({ method: "pin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("fuel-tracker")
      .setAudience("fuel-tracker/app")
      .setIssuedAt(new Date("2020-01-01"))
      .setExpirationTime(new Date("2020-01-02"))
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySession(expired)).resolves.toBeNull();
  });

  it("відхиляє токен від чужого видавця", async () => {
    const foreignIssuer = await new SignJWT({ method: "pin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("хтось-інший")
      .setAudience("fuel-tracker/app")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySession(foreignIssuer)).resolves.toBeNull();
  });

  it("відхиляє токен із невідомим способом входу", async () => {
    const weird = await new SignJWT({ method: "магія" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("fuel-tracker")
      .setAudience("fuel-tracker/app")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySession(weird)).resolves.toBeNull();
  });

  it("вимагає секрет достатньої довжини", async () => {
    process.env.AUTH_SESSION_SECRET = "закоротко";
    await expect(signSession({ method: "pin" })).rejects.toThrow(
      /щонайменше 32/,
    );
  });
});
