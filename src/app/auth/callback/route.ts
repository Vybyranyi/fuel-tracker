import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Повернення від Google.
 *
 * Google приводить сюди з одноразовим кодом; обмін коду на сесію завершує
 * вхід і виставляє куки. Перевірочна частина пари PKCE лежить у куці, яку
 * поклав сервер, коли вхід починався, — тому обмін має відбуватись саме тут,
 * на сервері, а не в браузері.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  // Тільки внутрішній шлях: `next` приходить з адресного рядка, і без цієї
  // перевірки вхід можна було б завершити переходом на чужий сайт.
  const next = searchParams.get("next");
  const destination =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    // Людина відмовила в доступі або посилання зіпсоване — це не збій
    // застосунку, тож повертаємо на вхід із поясненням, а не 500.
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Не вдалося завершити вхід через Google", error);
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  return NextResponse.redirect(new URL(destination, origin));
}
