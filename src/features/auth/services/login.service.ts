import "server-only";

import type { AuthError } from "@supabase/supabase-js";

import { classifyAuthFailure } from "@/features/auth/domain/auth-failure";
import type {
  EmailCodeInput,
  EmailInput,
} from "@/features/auth/schemas/sign-in.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserFacingError } from "@/lib/safe-action";

/**
 * Перетворює помилку Supabase на текст для людини.
 *
 * Головне тут — розрізняти «сервер відмовив» і «до сервера не достукались».
 * Обидва випадки приходять однаковим `error`, але означають протилежне: у
 * першому винен ввід, у другому — ввід правильний, і радити перенабрати код
 * означає відправити людину по колу. Тому все, що не є відповіддю Supabase,
 * іде окремим повідомленням, а справжня причина лягає в лог.
 */
function explain(error: AuthError, rejectionMessage: string): UserFacingError {
  switch (classifyAuthFailure(error)) {
    case "unreachable":
      // У повідомленні для людини причини немає — вона їй нічого не дасть, —
      // тож справжня лягає в лог, інакше розбирати не буде чого.
      console.error("Supabase Auth недоступний", error);
      return new UserFacingError(
        "Не вдалося звʼязатися із сервісом входу. Спробуйте за хвилину.",
      );

    case "rate-limited":
      return new UserFacingError(
        "Забагато спроб. Зачекайте хвилину й спробуйте ще раз.",
      );

    case "rejected":
      return new UserFacingError(rejectionMessage);
  }
}

/**
 * Надсилає код на пошту.
 *
 * `shouldCreateUser` не вимикаємо: реєстрація відкрита, тож перший вхід
 * незнайомої адреси і є створенням акаунта.
 *
 * Прийде саме код, а не посилання, — але лише якщо в шаблоні листа стоїть
 * `{{ .Token }}`. Побачите в листі посилання — шаблон лишився типовим.
 */
export async function sendEmailCode({ email }: EmailInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    throw explain(error, "Не вдалося надіслати код. Перевірте адресу.");
  }
}

/** Звіряє код і відкриває сесію — куки виставляє сам клієнт Supabase. */
export async function verifyEmailCode({
  email,
  code,
}: EmailCodeInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error) {
    throw explain(
      error,
      "Код не підійшов. Перевірте його або надішліть новий.",
    );
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
