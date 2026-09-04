"use client";

import { MailCheck, Send } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/features/auth/actions/auth.actions";
import { firstValidationError } from "@/features/auth/components/validation-error";

export function ForgotPasswordForm() {
  const { execute, isPending, result } = useAction(requestPasswordResetAction);

  if (result.data?.email) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheck className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm">
          Якщо {result.data.email} зареєстрована, лист із посиланням уже в
          дорозі.
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        execute({ email: String(data.get("email") ?? "") });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Пошта</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="you@example.com"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        <Send aria-hidden />
        {isPending ? "Надсилаю…" : "Надіслати посилання"}
      </Button>

      <p className="min-h-5 text-center text-sm text-destructive" role="alert">
        {result.serverError ?? firstValidationError(result.validationErrors)}
      </p>
    </form>
  );
}
