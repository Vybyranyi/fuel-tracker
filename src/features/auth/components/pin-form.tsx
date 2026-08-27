"use client";

import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { signInAction } from "@/features/auth/actions/auth.actions";
import { PIN_LENGTH } from "@/features/auth/domain/verifier";

export function PinForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { execute, isPending } = useAction(signInAction, {
    onError({ error: actionError }) {
      // Поле треба звільнити, інакше наступний ввід дописувався б до старого
      // й одразу впирався б у довжину.
      setPin("");
      setError(
        actionError.serverError ??
          actionError.validationErrors?.pin?._errors?.[0] ??
          "Не вдалося увійти",
      );
    },
  });

  function handleChange(value: string): void {
    setPin(value);
    setError(null);

    // Автосабміт на останній цифрі: окрема кнопка «Увійти» під чотирма
    // клітинками — зайвий тап там, де намір і так однозначний. Робимо це в
    // обробнику зміни, а не в ефекті: ефект тут дав би зайвий цикл рендера.
    if (value.length === PIN_LENGTH) {
      execute({ pin: value });
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <InputOTP
        maxLength={PIN_LENGTH}
        value={pin}
        onChange={handleChange}
        disabled={isPending}
        autoFocus
        // Цифрова клавіатура на телефоні.
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="PIN"
      >
        <InputOTPGroup>
          {Array.from({ length: PIN_LENGTH }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className="size-14 text-xl"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>

      <p
        className="min-h-5 text-sm text-destructive"
        role="status"
        aria-live="polite"
      >
        {isPending ? null : error}
      </p>

      {isPending ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}
