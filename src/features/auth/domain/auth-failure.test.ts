import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthUnknownError,
} from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { classifyAuthFailure } from "@/features/auth/domain/auth-failure";

describe("classifyAuthFailure", () => {
  it("відмову сервера вважає помилкою вводу", () => {
    expect(
      classifyAuthFailure(new AuthApiError("bad otp", 403, "otp_expired")),
    ).toBe("rejected");
  });

  it("окремо впізнає перевищення ліміту", () => {
    expect(
      classifyAuthFailure(new AuthApiError("slow down", 429, "over_limit")),
    ).toBe("rate-limited");
  });

  it("нерозібрану відповідь вважає недоступністю, а не помилкою вводу", () => {
    // Саме так виглядає збій, коли до Supabase не достукались: замість JSON
    // приходить текст від проміжного вузла, і клієнт падає на розборі.
    const error = new AuthUnknownError(
      `Unexpected token 'H', "Host not i"... is not valid JSON`,
      new SyntaxError("unexpected token"),
    );

    expect(classifyAuthFailure(error)).toBe("unreachable");
  });

  it("мережевий 503 не плутає з відмовою сервера", () => {
    // Статус є, але це не відповідь Supabase — радити виправити код тут хибно.
    expect(classifyAuthFailure(new AuthRetryableFetchError("down", 503))).toBe(
      "unreachable",
    );
  });

  it("витримує все, що взагалі не є помилкою Supabase", () => {
    for (const value of [new Error("boom"), null, undefined, "рядок"]) {
      expect(classifyAuthFailure(value)).toBe("unreachable");
    }
  });
});
