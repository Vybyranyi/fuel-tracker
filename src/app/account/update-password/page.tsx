import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";

export const metadata = { title: "Новий пароль — Пальне" };
export const dynamic = "force-dynamic";

/**
 * Свідомо поза групою `(app)`.
 *
 * Сюди приходять за посиланням із листа, і сесія вже є — але авто може не
 * бути. Оболонка `(app)` відвела б таку людину заводити авто, і змінити
 * пароль вона б не встигла.
 */
export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <div className="flex w-full max-w-xs flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">Новий пароль</h1>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
