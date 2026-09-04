"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  credentialsSchema,
  emailSchema,
  newPasswordSchema,
} from "@/features/auth/schemas/sign-in.schema";
import * as service from "@/features/auth/services/login.service";
import { actionClient } from "@/lib/safe-action";

/**
 * Куди вести після входу.
 *
 * Тільки шлях усередині застосунку: `next` приходить із адресного рядка, тож
 * без цієї перевірки будь-хто міг би підсунути посилання, яке після входу
 * веде на чужий сайт.
 */
const nextPathSchema = z
  .string()
  .regex(/^\/(?!\/)/, "Очікується шлях усередині застосунку")
  .optional();

export const signInAction = actionClient
  .inputSchema(credentialsSchema.extend({ next: nextPathSchema }))
  .action(async ({ parsedInput: { next, ...credentials } }) => {
    await service.signIn(credentials);
    // Перенаправлення саме тут, а не в компоненті: інакше між успішною
    // відповіддю й переходом устигав би промайнути екран входу.
    redirect(next ?? "/");
  });

export const signUpAction = actionClient
  .inputSchema(credentialsSchema.extend({ next: nextPathSchema }))
  .action(async ({ parsedInput: { next, ...credentials } }) => {
    const { needsConfirmation } = await service.signUp(credentials);

    // Підтвердження ще попереду — сесії немає, вести нікуди. Форма скаже
    // піти в пошту.
    if (needsConfirmation) return { needsConfirmation: true };

    redirect(next ?? "/");
  });

export const requestPasswordResetAction = actionClient
  .inputSchema(emailSchema)
  .action(async ({ parsedInput }) => {
    await service.requestPasswordReset(parsedInput);
    return { email: parsedInput.email };
  });

export const setPasswordAction = actionClient
  .inputSchema(newPasswordSchema)
  .action(async ({ parsedInput }) => {
    await service.setPassword(parsedInput.password);
    redirect("/");
  });

export const signOutAction = actionClient.action(async () => {
  await service.signOut();
  redirect("/login");
});
