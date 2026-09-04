import { Fuel } from "lucide-react";

import { EmailSignInForm } from "@/features/auth/components/email-sign-in-form";

export const metadata = { title: "Вхід — Пальне" };

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Fuel className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold tracking-tight">Пальне</h1>
        <p className="text-sm text-muted-foreground">
          Облік заправок і обслуговування авто
        </p>
      </div>

      <div className="w-full max-w-xs">
        <EmailSignInForm next={next} />
      </div>
    </main>
  );
}
