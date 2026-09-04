import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = { title: "Відновлення пароля — Пальне" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <div className="flex w-full max-w-xs flex-col gap-6">
        <Link
          href="/login"
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          До входу
        </Link>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Забули пароль
          </h1>
          <p className="text-sm text-muted-foreground">
            Надішлемо посилання, за яким можна задати новий.
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </main>
  );
}
