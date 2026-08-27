/**
 * Обмеження темпу спроб входу.
 *
 * PIN — чотири цифри, тобто 10 000 комбінацій. Хешування секрету тут нічого
 * не дає: маючи хеш, перебрати десять тисяч варіантів — справа секунд. Єдине,
 * що справді захищає, — зробити самі спроби дорогими за часом.
 */

/** Стан лічильника для одного ключа (IP або глобального). */
export interface ThrottleState {
  failedCount: number;
  lockedUntil: Date | null;
}

export interface ThrottlePolicy {
  /** Скільки промахів дозволено до першого блокування. */
  freeAttempts: number;
  /** Тривалість першого блокування. */
  baseLockMs: number;
  /** Стеля, вище якої блокування не росте. */
  maxLockMs: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Політика для окремої адреси.
 *
 * Кілька промахів — це зазвичай просто забутий PIN, тому перші чотири спроби
 * безкоштовні, а перше блокування коротке.
 */
export const PER_IP_POLICY: ThrottlePolicy = {
  freeAttempts: 4,
  baseLockMs: 15 * MINUTE,
  maxLockMs: 24 * HOUR,
};

/**
 * Політика для всіх спроб разом.
 *
 * Обмеження на адресу саме по собі майже не працює: атакувальник міняє IP і
 * перебирає далі. Тому поверх нього є глобальний лічильник — його поріг вищий,
 * щоб власник не блокував себе випадково, але саме він зупиняє перебір.
 */
export const GLOBAL_POLICY: ThrottlePolicy = {
  freeAttempts: 14,
  baseLockMs: 15 * MINUTE,
  maxLockMs: 24 * HOUR,
};

/** Ключ глобального лічильника в тій самій таблиці, що й адреси. */
export const GLOBAL_THROTTLE_KEY = "global";

export const INITIAL_THROTTLE_STATE: ThrottleState = {
  failedCount: 0,
  lockedUntil: null,
};

/**
 * Скільки триватиме блокування після `failedCount` промахів.
 *
 * Подвоюється з кожним промахом понад безкоштовні: 15 хв, 30 хв, година…
 * Перебір, який на початку коштував секунди, дуже швидко стає марним.
 */
export function lockDurationMs(
  failedCount: number,
  policy: ThrottlePolicy,
): number {
  const over = failedCount - policy.freeAttempts;
  if (over <= 0) return 0;

  const doubled = policy.baseLockMs * 2 ** (over - 1);
  return Math.min(doubled, policy.maxLockMs);
}

export function isLocked(state: ThrottleState, now: Date): boolean {
  return (
    state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime()
  );
}

/** Скільки лишилось чекати, у мілісекундах. Нуль, якщо блокування нема. */
export function remainingLockMs(state: ThrottleState, now: Date): number {
  if (!state.lockedUntil) return 0;
  return Math.max(0, state.lockedUntil.getTime() - now.getTime());
}

/** Новий стан після невдалої спроби. */
export function registerFailure(
  state: ThrottleState,
  policy: ThrottlePolicy,
  now: Date,
): ThrottleState {
  const failedCount = state.failedCount + 1;
  const lockMs = lockDurationMs(failedCount, policy);

  return {
    failedCount,
    lockedUntil: lockMs > 0 ? new Date(now.getTime() + lockMs) : null,
  };
}

/** Після успішного входу лічильник обнуляється. */
export function registerSuccess(): ThrottleState {
  return INITIAL_THROTTLE_STATE;
}

/**
 * Людський опис часу очікування.
 *
 * «Спробуйте за 15 хв» зрозуміліше, ніж точний час розблокування: користувач
 * і так не звірятиметься з годинником.
 */
export function describeWait(milliseconds: number): string {
  const minutes = Math.ceil(milliseconds / MINUTE);
  if (minutes <= 1) return "менш ніж за хвилину";
  if (minutes < 60) return `за ${minutes} хв`;

  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "за годину" : `за ${hours} год`;
}
