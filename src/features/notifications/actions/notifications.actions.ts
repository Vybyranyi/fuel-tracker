"use server";

import { revalidatePath } from "next/cache";

import {
  removePushSubscriptionSchema,
  savePushSubscriptionSchema,
} from "@/features/notifications/schemas/push-subscription.schema";
import * as service from "@/features/notifications/services/notifications.service";
import { actionClient } from "@/lib/safe-action";

/** Кількість підписаних пристроїв показується саме там. */
function revalidateSettings(): void {
  revalidatePath("/settings");
}

export const subscribeToPushAction = actionClient
  .inputSchema(savePushSubscriptionSchema)
  .action(async ({ parsedInput }) => {
    await service.subscribe(parsedInput);
    revalidateSettings();
    return { subscribed: true };
  });

export const unsubscribeFromPushAction = actionClient
  .inputSchema(removePushSubscriptionSchema)
  .action(async ({ parsedInput }) => {
    await service.unsubscribe(parsedInput.endpoint);
    revalidateSettings();
    return { subscribed: false };
  });

export const sendTestNotificationAction = actionClient.action(async () => {
  return service.sendTest();
});
