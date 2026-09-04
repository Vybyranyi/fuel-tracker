"use client";

import { KeyRound } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPasswordAction } from "@/features/auth/actions/auth.actions";
import { MIN_PASSWORD_LENGTH } from "@/features/auth/schemas/sign-in.schema";
import { firstValidationError } from "@/features/auth/components/validation-error";

export function UpdatePasswordForm() {
  const { execute, isPending, result } = useAction(setPasswordAction);

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        execute({
          password: String(data.get("password") ?? ""),
          confirmation: String(data.get("confirmation") ?? ""),
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Новий пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          required
          minLength={MIN_PASSWORD_LENGTH}
        />
        <p className="text-xs text-muted-foreground">
          Щонайменше {MIN_PASSWORD_LENGTH} символів.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmation">Ще раз</Label>
        <Input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <Button type="submit" disabled={isPending}>
        <KeyRound aria-hidden />
        {isPending ? "Зберігаю…" : "Зберегти пароль"}
      </Button>

      <p className="min-h-5 text-center text-sm text-destructive" role="alert">
        {result.serverError ?? firstValidationError(result.validationErrors)}
      </p>
    </form>
  );
}
