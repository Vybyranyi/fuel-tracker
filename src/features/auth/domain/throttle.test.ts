import { describe, expect, it } from "vitest";

import {
  describeWait,
  GLOBAL_POLICY,
  INITIAL_THROTTLE_STATE,
  isLocked,
  lockDurationMs,
  PER_IP_POLICY,
  registerFailure,
  registerSuccess,
  remainingLockMs,
  type ThrottleState,
} from "@/features/auth/domain/throttle";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const now = new Date("2026-08-26T12:00:00Z");

/** Прогонить n промахів поспіль, повертає підсумковий стан. */
function afterFailures(count: number, policy = PER_IP_POLICY): ThrottleState {
  let state = INITIAL_THROTTLE_STATE;
  for (let i = 0; i < count; i += 1) {
    state = registerFailure(state, policy, now);
  }
  return state;
}

describe("тривалість блокування", () => {
  it("перші спроби безкоштовні", () => {
    for (let attempt = 1; attempt <= PER_IP_POLICY.freeAttempts; attempt += 1) {
      expect(lockDurationMs(attempt, PER_IP_POLICY)).toBe(0);
    }
  });

  it("подвоюється з кожним промахом понад безкоштовні", () => {
    const first = PER_IP_POLICY.freeAttempts + 1;
    expect(lockDurationMs(first, PER_IP_POLICY)).toBe(15 * MINUTE);
    expect(lockDurationMs(first + 1, PER_IP_POLICY)).toBe(30 * MINUTE);
    expect(lockDurationMs(first + 2, PER_IP_POLICY)).toBe(HOUR);
    expect(lockDurationMs(first + 3, PER_IP_POLICY)).toBe(2 * HOUR);
  });

  it("упирається в стелю, а не росте до нескінченності", () => {
    // Без стелі 40 промахів дали б блокування на тисячі років — і власник
    // уже ніколи не зайшов би.
    expect(lockDurationMs(40, PER_IP_POLICY)).toBe(PER_IP_POLICY.maxLockMs);
    expect(lockDurationMs(200, PER_IP_POLICY)).toBe(24 * HOUR);
  });
});

describe("лічильник промахів", () => {
  it("до порогу не блокує", () => {
    const state = afterFailures(PER_IP_POLICY.freeAttempts);
    expect(state.failedCount).toBe(4);
    expect(state.lockedUntil).toBeNull();
    expect(isLocked(state, now)).toBe(false);
  });

  it("на пʼятому промаху вмикає блокування", () => {
    const state = afterFailures(5);
    expect(isLocked(state, now)).toBe(true);
    expect(remainingLockMs(state, now)).toBe(15 * MINUTE);
  });

  it("блокування спливає саме собою", () => {
    const state = afterFailures(5);
    const later = new Date(now.getTime() + 15 * MINUTE + 1);
    expect(isLocked(state, later)).toBe(false);
    expect(remainingLockMs(state, later)).toBe(0);
  });

  it("успішний вхід обнуляє лічильник", () => {
    expect(registerSuccess()).toEqual(INITIAL_THROTTLE_STATE);
  });
});

describe("дві політики", () => {
  it("глобальна терпить більше промахів, ніж на одну адресу", () => {
    // Інакше власник блокував би себе випадково щоразу, коли забув PIN.
    expect(GLOBAL_POLICY.freeAttempts).toBeGreaterThan(
      PER_IP_POLICY.freeAttempts,
    );
  });

  it("глобальна все одно спрацьовує — саме вона зупиняє перебір із різних IP", () => {
    const state = afterFailures(GLOBAL_POLICY.freeAttempts + 1, GLOBAL_POLICY);
    expect(isLocked(state, now)).toBe(true);
  });

  it("перебір стає марним дуже швидко", () => {
    // Десять промахів понад поріг — і наступна спроба аж за добу.
    const state = afterFailures(GLOBAL_POLICY.freeAttempts + 10, GLOBAL_POLICY);
    expect(remainingLockMs(state, now)).toBe(24 * HOUR);
  });
});

describe("describeWait", () => {
  it("говорить по-людськи", () => {
    expect(describeWait(30_000)).toBe("менш ніж за хвилину");
    expect(describeWait(15 * MINUTE)).toBe("за 15 хв");
    expect(describeWait(HOUR)).toBe("за годину");
    expect(describeWait(3 * HOUR)).toBe("за 3 год");
    expect(describeWait(24 * HOUR)).toBe("за 24 год");
  });
});
