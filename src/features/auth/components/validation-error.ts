/**
 * Перше повідомлення з `validationErrors` дії.
 *
 * Самого `serverError` мало: якщо ввід не проходить схему, дія повертає
 * `validationErrors`, а форма без цього не показала б нічого — найгірший
 * різновид відмови, мовчазний.
 */
export function firstValidationError(errors: unknown): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;

  for (const issue of Object.values(
    errors as Record<string, { _errors?: string[] } | undefined>,
  )) {
    const message = issue?._errors?.[0];
    if (message) return message;
  }

  return undefined;
}
