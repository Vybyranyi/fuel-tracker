import { NextResponse, type NextRequest } from "next/server";

import { refreshSession } from "@/lib/supabase/proxy";

/**
 * Шляхи, які браузер тягне ще до входу.
 *
 * Іконки, маніфест і service worker запитуються без сесії — зокрема на самому
 * екрані входу і в момент, коли iOS додає застосунок на головний екран. Якщо
 * гейт відповість на них редіректом, замість картинки прийде HTML.
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

const LOGIN_PATH = "/login";

/**
 * Гейт входу — і продовження сесії.
 *
 * Дві роботи в одному місці, бо друга можлива тільки тут: серверні компоненти
 * не вміють писати куки, тож оновити токен доступу може лише те, що
 * виконується раніше за них.
 *
 * Перевірка тут навмисно неглибока — «є дійсний токен чи ні». Проксі
 * спрацьовує на кожен запит, включно з передзавантаженням посилань, тож ходити
 * звідси в базу означало б платити за це щоразу. Справжня перевірка живе в
 * `requireUser()`, і саме її кличе кожен сервіс: документація Next прямо
 * попереджає, що matcher проксі не покриває server actions, тож покладатись
 * тільки на цей файл не можна.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ASSET_PATHS.has(pathname) || pathname.startsWith("/icons/")) {
    return NextResponse.next();
  }

  const { response, userId } = await refreshSession(request);

  if (!userId && pathname !== LOGIN_PATH) {
    const loginUrl = new URL(LOGIN_PATH, request.url);

    // Куди повернутись після входу: перехід із пуш-сповіщення веде на
    // конкретну сторінку, і втрачати її на екрані входу не хочеться.
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }

    return redirectKeepingCookies(loginUrl, response);
  }

  if (userId && pathname === LOGIN_PATH) {
    return redirectKeepingCookies(new URL("/", request.url), response);
  }

  return response;
}

/**
 * Редірект, який не губить оновлених кук.
 *
 * `refreshSession` міг щойно видати новий токен. Якщо повернути голий
 * `NextResponse.redirect`, цей токен нікуди не потрапить, а старий у браузері
 * вже вважається використаним — і наступний запит прийде без сесії.
 */
function redirectKeepingCookies(url: URL, source: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);

  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }

  return redirect;
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
