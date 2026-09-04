import "server-only";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";

import { classifyAuthFailure } from "@/features/auth/domain/auth-failure";
import type {
  EmailCodeInput,
  EmailInput,
} from "@/features/auth/schemas/sign-in.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserFacingError } from "@/lib/safe-action";

/** Куди Google повертає людину після згоди. */
const OAUTH_CALLBACK_PATH = "/auth/callback";

/**
 * Адреса застосунку так, як її бачить браузер.
 *
 * Не з константи й не зі змінної оточення: у превʼю-деплоях домен щоразу
 * інший, і зашитий redirect ламав би вхід саме там, де його зручно перевіряти.
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

/**
 * Починає вхід через Google і повертає адресу, куди вести браузер.
 *
 * Саме на сервері, а не в браузері: так перевірочний код PKCE лягає в куку,
 * яку потім читає `/auth/callback`. Якби вхід починався з клієнта, обмін коду
 * на сесію на сервері вже не склався б.
 */
export async function startGoogleSignIn(next?: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const origin = await currentOrigin();
  const callback = new URL(OAUTH_CALLBACK_PATH, origin);

  if (next) callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });

  if (error || !data.url) {
    throw new UserFacingError("Не вдалося почати вхід через Google");
  }

  return data.url;
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
