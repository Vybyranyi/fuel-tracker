import { describe, expect, it } from "vitest";

import { decodeVapidKey } from "@/features/notifications/domain/vapid-key";

describe("decodeVapidKey", () => {
  it("розбирає справжній ключ у 65 байтів", () => {
    // Пара, згенерована `web-push generate-vapid-keys`: публічний ключ — це
    // нестиснена точка кривої P-256, тобто рівно 65 байтів із префіксом 0x04.
    const key =
      "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
    const bytes = decodeVapidKey(key);

    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(0x04);
  });

  it("повертає base64url-символи на місце", () => {
    // "??>" у стандартному base64 — це "Pz8+", у base64url — "Pz8-".
    expect(Array.from(decodeVapidKey("Pz8-"))).toEqual([0x3f, 0x3f, 0x3e]);
    // "??" + 0xFF дає "Pz8/" у стандартному й "Pz8_" у base64url.
    expect(Array.from(decodeVapidKey("Pz8_"))).toEqual([0x3f, 0x3f, 0x3f]);
  });

  it("доповнює хвіст, якого браузер не надсилає", () => {
    // "Pz8" без вирівнювання — два байти; з "=" у кінці atob прийняв би, без
    // нього кинув би InvalidCharacterError.
    expect(Array.from(decodeVapidKey("Pz8"))).toEqual([0x3f, 0x3f]);
    expect(Array.from(decodeVapidKey("Pw"))).toEqual([0x3f]);
  });
});
