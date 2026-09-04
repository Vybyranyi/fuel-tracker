import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/**
 * Хто зараз працює із застосунком.
 *
 * `cache` з React — щоб за один рендер сходити по це раз, а не стільки разів,
 * скільки компонентів спитає. Кеш живе рівно один запит.
 *
 * `getClaims` перевіряє підпис токена ключем проєкту. `getSession` тут був би
 * помилкою: він бере куку на віру, а куку підробити може будь-хто.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims.sub) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

/**
 * Те саме, але для коду, який без користувача не має сенсу.
 *
 * Кличеться на початку кожного сервісу — і це не дублювання перевірки з
 * проксі, а єдина справжня. Документація Next прямо каже: matcher проксі не
 * поширюється на server actions, тож перевіряти доступ треба всередині
 * кожного з них.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    // Не `UserFacingError`: це не те, що користувач може виправити, ввівши
    // щось інше. Проксі вже мав завернути такий запит на вхід, тож сюди
    // потрапляють хіба що застарілі вкладки.
    throw new Error("Немає активної сесії");
  }

  return user;
}
