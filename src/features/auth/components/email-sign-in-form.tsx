"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Mail } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  sendEmailCodeAction,
  verifyEmailCodeAction,
} from "@/features/auth/actions/auth.actions";
import { EMAIL_CODE_LENGTH } from "@/features/auth/schemas/sign-in.schema";

/**
 * Вхід за кодом із пошти.
 *
 * Код, а не посилання з листа: на айфоні посилання відкривається в Safari, а
 * застосунок із головного екрана — окреме вікно зі своїм сховищем. Сесія
 * лягла б не туди, і людина, натиснувши посилання, лишилась би незалогіненою
 * саме там, звідки заходить щодня.
 */
export function EmailSignInForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = useAction(sendEmailCodeAction, {
    onSuccess({ data }) {
      setSentTo(data?.email ?? email);
      setCode("");
    },
  });

  const verify = useAction(verifyEmailCodeAction, {
    onError() {
      // Звільняємо поле: інакше наступний ввід дописувався б до старого коду
      // й одразу впирався б у довжину.
      setCode("");
    },
  });

  function submitCode(value: string): void {
    if (!sentTo) return;
    verify.execute({ email: sentTo, code: value, next });
  }

  /**
   * Будь-яка причина відмови — і серверна, і від перевірки схеми.
   *
   * Самого `serverError` мало: якби у вводі опинилось щось, що не проходить
   * схему, дія повернула б `validationErrors`, а форма не показала б нічого —
   * найгірший різновид відмови, мовчазний.
   */
  const error =
    send.result.serverError ??
    verify.result.serverError ??
    firstValidationError(send.result.validationErrors) ??
    firstValidationError(verify.result.validationErrors);
  const isBusy = send.isPending || verify.isPending;

  if (!sentTo) {
    return (
      <form
        className="flex w-full flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          send.execute({ email });
        }}
      >
        <Label htmlFor="email">Пошта</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Button type="submit" disabled={isBusy || email.length === 0}>
          <Mail aria-hidden />
          {send.isPending ? "Надсилаю…" : "Надіслати код"}
        </Button>

        <Message error={error} />
      </form>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center text-sm text-muted-foreground">
        Код надіслано на <span className="text-foreground">{sentTo}</span>
      </p>

      <InputOTP
        maxLength={EMAIL_CODE_LENGTH}
        value={code}
        onChange={setCode}
        disabled={verify.isPending}
        // Без цього в поле пролазять літери: шість символів набралось би, дія
        // пішла б на сервер і мовчки впала на перевірці «шість цифр».
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        // Дає айфону запропонувати код одразу з банера сповіщення про лист.
        autoComplete="one-time-code"
        autoFocus
        onComplete={submitCode}
      >
        <InputOTPGroup>
          {Array.from({ length: EMAIL_CODE_LENGTH }, (_, index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>

      <Message error={error} />

      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={() => send.execute({ email: sentTo })}
        >
          {send.isPending ? "Надсилаю…" : "Надіслати код ще раз"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={() => {
            setSentTo(null);
            setCode("");
            send.reset();
            verify.reset();
          }}
        >
          Інша адреса
        </Button>
      </div>
    </div>
  );
}

type ValidationErrors =
  { [key: string]: { _errors?: string[] } | undefined } | undefined;

function firstValidationError(errors: unknown): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;

  for (const issue of Object.values(errors as NonNullable<ValidationErrors>)) {
    const message = issue?._errors?.[0];
    if (message) return message;
  }

  return undefined;
}

/** Місце під помилку тримається завжди — інакше поява тексту смикає розкладку. */
function Message({ error }: { error?: string }) {
  return (
    <p className="min-h-5 text-center text-sm text-destructive" role="alert">
      {error}
    </p>
  );
}
