"use client";

import { LogOut } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions/auth.actions";

/** Вихід із застосунку. Живе в налаштуваннях — там, де його шукають. */
export function SignOutButton() {
  const { execute, isPending } = useAction(signOutAction);

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => execute()}
      className="justify-start"
    >
      <LogOut aria-hidden />
      Вийти
    </Button>
  );
}
