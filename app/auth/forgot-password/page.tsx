import Link from "next/link";
import { requestPasswordReset } from "@/app/actions";
import { Button, Card, Input, Label } from "@/components/ui";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md" title="Сброс пароля">
        <p className="mb-4 text-sm text-slate-400">
          Введите email. Мы отправим ссылку для установки нового пароля.
        </p>
        <form action={requestPasswordReset} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required autoComplete="email" />
          </div>
          {params.error ? (
            <p className="text-sm text-rose-400">{params.error}</p>
          ) : null}
          {params.message ? (
            <p className="text-sm text-emerald-400">{params.message}</p>
          ) : null}
          <Button type="submit" className="w-full">
            Отправить ссылку
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          <Link href="/login" className="hover:text-amber-300">
            Назад ко входу
          </Link>
        </p>
      </Card>
    </div>
  );
}
