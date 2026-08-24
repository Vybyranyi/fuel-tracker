import { Fuel } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <Fuel className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">Пальне</h1>
      <p className="text-sm text-muted-foreground">
        Облік заправок. Форма внесення зʼявиться тут.
      </p>
    </main>
  );
}
