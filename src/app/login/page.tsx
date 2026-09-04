import { Fuel } from "lucide-react";

import { EmailSignInForm } from "@/features/auth/components/email-sign-in-form";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";

export const metadata = { title: "Вхід — Пальне" };

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Fuel className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold tracking-tight">Пальне</h1>
        <p className="text-sm text-muted-foreground">
          Облік заправок і обслуговування авто
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-5">
        {error === "oauth" ? (
          <p
            className="rounded-lg border border-destructive/40 px-3 py-2 text-center text-sm text-destructive"
            role="alert"
          >
            Вхід через Google не завершився. Спробуйте ще раз.
          </p>
        ) : null}

        <GoogleSignInButton next={next} />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">або</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <EmailSignInForm next={next} />
      </div>
    </main>
  );
}
