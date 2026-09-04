import { Fuel } from "lucide-react";

import { CredentialsForm } from "@/features/auth/components/credentials-form";

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

      <div className="w-full max-w-xs">
        {error === "link" ? (
          <p
            className="mb-4 rounded-lg border border-destructive/40 px-3 py-2 text-center text-sm text-destructive"
            role="alert"
          >
            Посилання з листа не спрацювало — воно протухло або ним уже
            скористались. Спробуйте ще раз.
          </p>
        ) : null}

        <CredentialsForm next={next} />
      </div>
    </main>
  );
}
