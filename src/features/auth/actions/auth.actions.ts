"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  emailCodeSchema,
  emailSchema,
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

export const sendEmailCodeAction = actionClient
  .inputSchema(emailSchema)
  .action(async ({ parsedInput }) => {
    await service.sendEmailCode(parsedInput);
    return { email: parsedInput.email };
  });

export const verifyEmailCodeAction = actionClient
  .inputSchema(emailCodeSchema.extend({ next: nextPathSchema }))
  .action(async ({ parsedInput: { next, ...credentials } }) => {
    await service.verifyEmailCode(credentials);
    // Перенаправлення саме тут, а не в компоненті: інакше між успішною
    // відповіддю й переходом устигав би промайнути екран входу.
    redirect(next ?? "/");
  });

export const signOutAction = actionClient.action(async () => {
  await service.signOut();
  redirect("/login");
});
