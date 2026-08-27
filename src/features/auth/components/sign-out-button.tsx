"use client";

import { LogOut } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions/auth.actions";

/**
 * Тимчасове місце для виходу — у шапці головної.
 *
 * За планом кнопка живе в налаштуваннях, але тієї сторінки ще немає, а мати
 * спосіб вийти треба вже зараз, хоча б щоб перевірити сам вхід.
 */
export function SignOutButton() {
  const { execute, isPending } = useAction(signOutAction);

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={() => execute()}
      aria-label="Вийти"
    >
      <LogOut />
    </Button>
  );
}
