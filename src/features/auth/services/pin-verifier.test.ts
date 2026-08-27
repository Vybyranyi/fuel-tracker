import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PinVerifier } from "@/features/auth/services/pin-verifier";

const original = process.env.AUTH_PIN;
const verifier = new PinVerifier();

beforeEach(() => {
  process.env.AUTH_PIN = "2006";
});

afterEach(() => {
  process.env.AUTH_PIN = original;
});

describe("PinVerifier", () => {
  it("приймає правильний PIN", async () => {
    await expect(verifier.verify("2006")).resolves.toBe(true);
  });

  it("відхиляє неправильний", async () => {
    for (const wrong of ["2007", "0000", "9999"]) {
      await expect(verifier.verify(wrong)).resolves.toBe(false);
    }
  });

  it("не падає на вводі іншої довжини", async () => {
    // `timingSafeEqual` кидає виняток на буферах різної довжини — саме тому
    // порівнюються хеші, а не самі рядки. Інакше довжина введеного видавала б
    // себе через помилку сервера.
    for (const odd of ["", "1", "123", "123456", "не цифри"]) {
      await expect(verifier.verify(odd)).resolves.toBe(false);
    }
  });

  it("повідомляє про неправильно налаштоване оточення", async () => {
    process.env.AUTH_PIN = "12345";
    await expect(verifier.verify("1234")).rejects.toThrow(/AUTH_PIN/);

    delete process.env.AUTH_PIN;
    await expect(verifier.verify("1234")).rejects.toThrow(/AUTH_PIN/);
  });

  it("називає спосіб входу — його запамʼятає сесія", () => {
    expect(verifier.method).toBe("pin");
  });
});
