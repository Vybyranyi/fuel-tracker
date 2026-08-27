"use server";

import { redirect } from "next/navigation";

import { signInSchema } from "@/features/auth/schemas/sign-in.schema";
import * as service from "@/features/auth/services/login.service";
import { actionClient } from "@/lib/safe-action";

export const signInAction = actionClient
  .inputSchema(signInSchema)
  .action(async ({ parsedInput }) => {
    await service.signIn(parsedInput.pin);
    // Перенаправлення саме тут, а не в компоненті: інакше між успішною
    // відповіддю й переходом устигав би промайнути екран входу.
    redirect("/");
  });

export const signOutAction = actionClient.action(async () => {
  await service.signOut();
  redirect("/login");
});
