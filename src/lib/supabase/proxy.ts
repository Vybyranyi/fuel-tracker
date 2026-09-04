import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export interface RefreshedSession {
  /**
   * Відповідь із оновленими куками. Її треба або віддати як є, або перенести
   * куки на власну — інакше браузер лишиться зі старим токеном, а сервер
   * вважатиме його оновленим, і сесія обірветься на рівному місці.
   */
  response: NextResponse;
  /** Ідентифікатор користувача або `null`, якщо сесії немає. */
  userId: string | null;
}

/**
 * Оновлює токен доступу й повертає, хто прийшов.
 *
 * Серверні компоненти не вміють писати куки, тож продовжувати сесію може
 * тільки те, що виконується раніше за них, — проксі. Приберіть цей виклик, і
 * користувачів почне випадково викидати, коли термін токена мине.
 *
 * `getClaims`, а не `getSession`: перший перевіряє підпис токена публічним
 * ключем проєкту, другий бере куку на віру. А куку підробити може будь-хто.
 */
export async function refreshSession(
  request: NextRequest,
): Promise<RefreshedSession> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // Заголовки заборони кешування. Без них проміжний кеш міг би віддати
        // сторінку з чужою сесією — тобто рівно те, від чого ми тут будуємо
        // три рубежі захисту.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Між створенням клієнта й цим викликом не має бути нічого: будь-яка
  // операція з куками посередині розсинхронізує запит із відповіддю.
  const { data } = await supabase.auth.getClaims();

  return { response, userId: data?.claims.sub ?? null };
}
