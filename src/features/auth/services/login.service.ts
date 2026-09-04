import "server-only";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";

import {
  authErrorCode,
  classifyAuthFailure,
} from "@/features/auth/domain/auth-failure";
import type {
  CredentialsInput,
  EmailInput,
} from "@/features/auth/schemas/sign-in.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserFacingError } from "@/lib/safe-action";

/** Куди веде посилання з листа про відновлення пароля. */
const CONFIRM_PATH = "/auth/confirm";

/**
 * Адреса застосунку так, як її бачить браузер.
 *
 * Не з константи й не зі змінної оточення: у превʼю-деплоях домен щоразу
 * інший, і зашитий redirect ламав би відновлення саме там, де його зручно
 * перевіряти.
 */
async function currentOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  return `${protocol}://${host}`;
}

/**
 * Перетворює помилку Supabase на текст для людини.
 *
 * Головне тут — розрізняти «сервер відмовив» і «до сервера не достукались».
 * Обидва випадки приходять однаковим `error`, але означають протилежне: у
 * першому винен ввід, у другому — ввід правильний, і радити перевірити пароль
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

export async function signIn({
  email,
  password,
}: CredentialsInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (!error) return;

  // «Пошта не підтверджена» виглядає так само, як невірний пароль, — але
  // робити треба протилежне: не згадувати пароль, а піти в пошту.
  if (authErrorCode(error) === "email_not_confirmed") {
    throw new UserFacingError(
      "Пошту ще не підтверджено. Перевірте лист, який надійшов при реєстрації.",
    );
  }

  // Навмисно не кажемо, що саме не підійшло: інакше формою можна було б
  // перебирати адреси й дізнаватись, хто тут зареєстрований.
  throw explain(error, "Неправильна пошта або пароль");
}

export interface SignUpResult {
  /** `true`, якщо Supabase чекає, поки людина підтвердить пошту. */
  needsConfirmation: boolean;
}

/**
 * Реєструє й одразу входить — якщо підтвердження пошти вимкнене.
 *
 * З увімкненим Supabase не віддає сесію, а надсилає лист із посиланням.
 * Обидва випадки тут рівноправні: код не вимагає певного налаштування, а
 * повідомляє нагору, що саме сталося, — інакше зміна перемикача в панелі
 * мовчки ламала б реєстрацію.
 */
export async function signUp({
  email,
  password,
}: CredentialsInput): Promise<SignUpResult> {
  const supabase = await createSupabaseServerClient();
  const origin = await currentOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}${CONFIRM_PATH}` },
  });

  if (error) {
    if (authErrorCode(error) === "user_already_exists") {
      throw new UserFacingError(
        "Ця пошта вже зареєстрована. Увійдіть або відновіть пароль.",
      );
    }

    if (authErrorCode(error) === "weak_password") {
      throw new UserFacingError("Пароль надто простий. Візьміть довший.");
    }

    throw explain(error, "Не вдалося зареєструватися");
  }

  return { needsConfirmation: data.session === null };
}

/**
 * Надсилає лист для відновлення пароля.
 *
 * Помилку не показуємо навіть тоді, коли адреси не існує: відповідь має бути
 * однаковою для будь-якої пошти, інакше формою можна перебирати, хто тут
 * зареєстрований.
 */
export async function requestPasswordReset({
  email,
}: EmailInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const origin = await currentOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}${CONFIRM_PATH}?next=/account/update-password`,
  });

  if (error) {
    throw explain(error, "Не вдалося надіслати лист. Перевірте адресу.");
  }
}

/**
 * Ставить новий пароль поточній сесії.
 *
 * Окремої перевірки «а чи це справді відновлення» тут немає й не треба:
 * сесія вже є — або звичайна, або створена посиланням із листа, — і в обох
 * випадках змінити свій пароль людина має право.
 */
export async function setPassword(password: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (authErrorCode(error) === "same_password") {
      throw new UserFacingError("Це той самий пароль, що й був.");
    }

    throw explain(error, "Не вдалося змінити пароль");
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
