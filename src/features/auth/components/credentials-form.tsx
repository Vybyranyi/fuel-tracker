"use client";

import { LogIn, MailCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInAction,
  signUpAction,
} from "@/features/auth/actions/auth.actions";
import { MIN_PASSWORD_LENGTH } from "@/features/auth/schemas/sign-in.schema";
import { firstValidationError } from "@/features/auth/components/validation-error";

type Mode = "sign-in" | "sign-up";

/**
 * Вхід і реєстрація однією формою.
 *
 * Перемикач, а не «спробувати увійти, а як не вийшло — зареєструвати»: друге
 * виглядає розумніше, але помилка в адресі мовчки заводила б новий порожній
 * акаунт, і людина не зрозуміла б, куди поділись її заправки.
 */
export function CredentialsForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("sign-in");

  const signIn = useAction(signInAction);
  const signUp = useAction(signUpAction);
  const active = mode === "sign-in" ? signIn : signUp;

  if (signUp.result.data?.needsConfirmation) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheck className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm">
          Перевірте пошту — там посилання, яке завершить реєстрацію.
        </p>
      </div>
    );
  }

  const error =
    active.result.serverError ??
    firstValidationError(active.result.validationErrors);

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        active.execute({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
          next,
        });
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          // Підказує менеджерам паролів, що саме зберігати: без цього вони
          // пропонують старий пароль там, де людина заводить новий.
          autoComplete={
            mode === "sign-in" ? "current-password" : "new-password"
          }
          required
          minLength={MIN_PASSWORD_LENGTH}
        />
        {mode === "sign-up" ? (
          <p className="text-xs text-muted-foreground">
            Щонайменше {MIN_PASSWORD_LENGTH} символів.
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={active.isPending}>
        {mode === "sign-in" ? <LogIn aria-hidden /> : <UserPlus aria-hidden />}
        {active.isPending
          ? "Хвилинку…"
          : mode === "sign-in"
            ? "Увійти"
            : "Зареєструватися"}
      </Button>

      <p className="min-h-5 text-center text-sm text-destructive" role="alert">
        {error}
      </p>

      <div className="flex flex-col items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            // Інакше помилка від попереднього режиму лишається висіти вже
            // над іншою формою.
            signIn.reset();
            signUp.reset();
          }}
        >
          {mode === "sign-in"
            ? "Немає акаунта? Зареєструватися"
            : "Уже є акаунт? Увійти"}
        </Button>

        {mode === "sign-in" ? (
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/forgot-password">Забули пароль?</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
