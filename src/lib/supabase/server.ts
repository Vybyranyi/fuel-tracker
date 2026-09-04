import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Клієнт Supabase для серверних компонентів, дій і маршрутів.
 *
 * Новий на кожен запит, а не один на процес: клієнт носить у собі куки саме
 * цього запиту, тож спільний інстанс віддавав би одному користувачеві сесію
 * іншого. Створення дешеве — це, по суті, налаштований `fetch`.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Серверний компонент писати куки не може — і не мусить: оновленням
          // сесії займається проксі, який відпрацював раніше на цьому ж
          // запиті. Тут це очікувана ситуація, а не збій.
        }
      },
    },
  });
}
