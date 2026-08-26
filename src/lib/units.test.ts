import { describe, expect, it } from "vitest";

import {
  decimal2,
  decimal2FromDbString,
  decimal2FromNumber,
  decimal2ToDbString,
  decimal2ToNumber,
  divideDecimals,
  multiplyDecimals,
  parseDecimal2,
  sumDecimals,
} from "@/lib/units";

describe("decimal2", () => {
  it("приймає лише цілу кількість сотих", () => {
    expect(decimal2(4055)).toBe(4055);
    expect(() => decimal2(40.55)).toThrow(RangeError);
    expect(() => decimal2(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});

describe("читання й запис у БД", () => {
  it("розбирає рядок numeric із Postgres", () => {
    expect(decimal2FromDbString("40.55")).toBe(4055);
    expect(decimal2FromDbString("40.50")).toBe(4050);
    expect(decimal2FromDbString("0.05")).toBe(5);
    expect(decimal2FromDbString("2351.49")).toBe(235149);
  });

  it("завжди віддає рівно два знаки з крапкою", () => {
    expect(decimal2ToDbString(decimal2(4055))).toBe("40.55");
    expect(decimal2ToDbString(decimal2(4050))).toBe("40.50");
    expect(decimal2ToDbString(decimal2(5))).toBe("0.05");
    expect(decimal2ToDbString(decimal2(0))).toBe("0.00");
    expect(decimal2ToDbString(decimal2(-5))).toBe("-0.05");
  });

  it("переживає обіг БД → домен → БД без втрат", () => {
    for (const value of ["0.00", "0.01", "40.55", "999.99", "12345.67"]) {
      expect(decimal2ToDbString(decimal2FromDbString(value))).toBe(value);
    }
  });

  it("падає на тому, що не є десятковим числом", () => {
    expect(() => decimal2FromDbString("сорок")).toThrow(TypeError);
    expect(() => decimal2FromDbString("")).toThrow(TypeError);
  });
});

describe("parseDecimal2 — те, що вводить людина", () => {
  it("приймає і кому, і крапку", () => {
    expect(parseDecimal2("40,55")).toBe(4055);
    expect(parseDecimal2("40.55")).toBe(4055);
  });

  it("приймає неповні записи", () => {
    expect(parseDecimal2("40")).toBe(4000);
    expect(parseDecimal2("40,5")).toBe(4050);
    expect(parseDecimal2(",5")).toBe(50);
    expect(parseDecimal2("40,")).toBe(4000);
  });

  it("не зважає на пробіли по краях", () => {
    expect(parseDecimal2("  57,99  ")).toBe(5799);
  });

  it("округлює зайві знаки до сотих", () => {
    expect(parseDecimal2("40,555")).toBe(4056);
    expect(parseDecimal2("40,554")).toBe(4055);
  });

  it("порожній ввід — це не помилка, а «ще не ввели»", () => {
    expect(parseDecimal2("")).toBeNull();
    expect(parseDecimal2("   ")).toBeNull();
  });

  it("відхиляє сміття", () => {
    for (const input of ["abc", "40.5.5", "4 0", "--1", "40,,5", "1e3"]) {
      expect(parseDecimal2(input)).toBeNull();
    }
  });
});

describe("арифметика", () => {
  it("додає точно там, де float помиляється", () => {
    // 0.1 + 0.2 !== 0.3 у подвійній точності; у сотих це просто 10 + 20.
    const total = sumDecimals([
      decimal2FromNumber(0.1),
      decimal2FromNumber(0.2),
    ]);
    expect(total).toBe(decimal2FromNumber(0.3));
    expect(decimal2ToNumber(total)).toBe(0.3);
  });

  it("сумує порожній список у нуль", () => {
    expect(sumDecimals([])).toBe(0);
  });

  it("множить обʼєм на ціну", () => {
    // 40.55 л × 57.99 ₴/л = 2351.4945 → 2351.49
    expect(multiplyDecimals(decimal2(4055), decimal2(5799))).toBe(235149);
  });

  it("ділить суму на ціну", () => {
    // 2351.49 ₴ / 57.99 ₴/л = 40.5499… → 40.55
    expect(divideDecimals(decimal2(235149), decimal2(5799))).toBe(4055);
  });

  it("округлює половину від нуля, а не в бік +∞", () => {
    // 0.5 сотої вгору в обидва боки
    expect(multiplyDecimals(decimal2(1), decimal2(50))).toBe(1);
    expect(multiplyDecimals(decimal2(-1), decimal2(50))).toBe(-1);
  });

  it("не ділить на нуль", () => {
    expect(() => divideDecimals(decimal2(100), decimal2(0))).toThrow(
      RangeError,
    );
  });

  it("падає, а не бреше, коли добуток виходить за точні цілі", () => {
    const huge = decimal2(Number.MAX_SAFE_INTEGER - 1);
    expect(() => multiplyDecimals(huge, huge)).toThrow(RangeError);
  });
});

describe("decimal2FromNumber", () => {
  it("округлює до сотих", () => {
    expect(decimal2FromNumber(40.554)).toBe(4055);
    expect(decimal2FromNumber(40.555)).toBe(4056);
  });

  it("не пропускає NaN та нескінченність", () => {
    expect(() => decimal2FromNumber(Number.NaN)).toThrow(RangeError);
    expect(() => decimal2FromNumber(Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
  });
});
