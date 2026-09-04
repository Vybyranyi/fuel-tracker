import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Перехід за посиланням із листа.
 *
 * Сюди веде і підтвердження пошти при реєстрації, і відновлення пароля.
 * Обмін `token_hash` на сесію робиться на сервері — цього вимагає PKCE, на
 * якому працює `@supabase/ssr`: у браузера просто немає другої половини пари.
 *
 * Шаблони листів у Supabase мають вести саме сюди — див. README.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Тільки внутрішній шлях: `next` приходить із листа, і без цієї перевірки
  // посилання можна було б скласти так, щоб воно вело на чужий сайт.
  const next = searchParams.get("next");
  const destination =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // Найчастіша причина — посилання протухло або ним уже скористались.
    console.error("Не вдалося підтвердити посилання з листа", error);
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }

  return NextResponse.redirect(new URL(destination, origin));
}
