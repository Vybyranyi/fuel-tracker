/**
 * Перше повідомлення з `validationErrors` дії.
 *
 * Самого `serverError` мало: якщо ввід не проходить схему, дія повертає
 * `validationErrors`, а форма без цього не показала б нічого — найгірший
 * різновид відмови, мовчазний.
 *
 * Шукаємо вглиб, а не лише на верхньому рівні: для масивів і вкладених
 * обʼєктів `next-safe-action` віддає дерево, і помилка позиції ТО лежить у
 * `items → 0 → name → _errors`. Плаский пошук на такій формі мовчав би —
 * рівно те, від чого ця функція й мала рятувати.
 */
export function firstValidationError(errors: unknown): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;

  const node = errors as { _errors?: unknown } & Record<string, unknown>;

  if (Array.isArray(node._errors)) {
    const message = node._errors.find(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    if (message) return message;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "_errors") continue;

    const nested = firstValidationError(value);
    if (nested) return nested;
  }

  return undefined;
}
