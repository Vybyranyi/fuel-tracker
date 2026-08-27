import { Fuel } from "lucide-react";

import { PinForm } from "@/features/auth/components/pin-form";

export const metadata = { title: "Вхід — Пальне" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Fuel className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold tracking-tight">Пальне</h1>
        <p className="text-sm text-muted-foreground">Введіть PIN</p>
      </div>

      <PinForm />
    </main>
  );
}
