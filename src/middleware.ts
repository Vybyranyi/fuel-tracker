import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  verifySession,
} from "@/features/auth/services/session";

/**
 * Гейт за PIN.
 *
 * Middleware перевіряє лише підпис куки — і нічого більше. Сам PIN звіряється
 * в server action, у Node-рантаймі: `node:crypto` на Edge недоступний, а
 * тягнути сюди базу заради лічильника спроб означало б ходити в неї на кожен
 * запит, включно зі статикою.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(token);

  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!session) {
    if (isLoginPage) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    // Куди повернутись після входу: перехід із пуш-сповіщення веде на
    // конкретну сторінку, і втрачати її на екрані входу не хочеться.
    if (request.nextUrl.pathname !== "/") {
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Уже увійшли — тримати екран входу відкритим немає сенсу.
  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Усе, крім:
     *  • /api/cron — крон приходить без куки й має власний секрет;
     *  • службових шляхів Next і файлів PWA, які браузер тягне до входу;
     *  • статики за розширенням.
     */
    "/((?!api/cron|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest)$).*)",
  ],
};
