import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  verifySession,
} from "@/features/auth/services/session";

/**
 * Шляхи, які браузер тягне ще до входу.
 *
 * Іконки, маніфест і service worker запитуються без куки — зокрема на самому
 * екрані входу і в момент, коли iOS додає застосунок на головний екран. Якщо
 * гейт відповість на них редіректом, замість картинки прийде HTML.
 *
 * Списком у коді, а не черговою альтернативою в регулярці matcher: та вже
 * стала нечитабельною, і додати до неї шлях, не зламавши сусідній, важко.
 */
const PUBLIC_ASSET_PATHS = new Set([
  "/icon",
  "/icon.png",
  "/apple-icon",
  "/apple-icon.png",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/sw.js",
]);

/**
 * Гейт за PIN.
 *
 * Middleware перевіряє лише підпис куки — і нічого більше. Сам PIN звіряється
 * в server action, у Node-рантаймі: `node:crypto` на Edge недоступний, а
 * тягнути сюди базу заради лічильника спроб означало б ходити в неї на кожен
 * запит, включно зі статикою.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ASSET_PATHS.has(pathname) || pathname.startsWith("/icons/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(token);

  const isLoginPage = pathname === "/login";

  if (!session) {
    if (isLoginPage) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    // Куди повернутись після входу: перехід із пуш-сповіщення веде на
    // конкретну сторінку, і втрачати її на екрані входу не хочеться.
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
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
     * Усе, крім внутрішніх шляхів Next і крон-ендпоінтів: крон приходить
     * без куки й має власний секрет. Решту винятків розбирає сама функція.
     */
    "/((?!api/cron|_next/static|_next/image).*)",
  ],
};
