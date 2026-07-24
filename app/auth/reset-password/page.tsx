import Link from "next/link";
import { setNewPassword } from "@/app/actions";
import { Button, Card, Input, Label } from "@/components/ui";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md" title="Новый пароль">
        <p className="mb-4 text-sm text-slate-400">
          Установите новый пароль для вашего аккаунта.
        </p>
        <form action={setNewPassword} className="space-y-4">
          <div>
            <Label>Новый пароль</Label>
            <Input
              name="password"
              type="password"
              minLength={6}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label>Повторите пароль</Label>
            <Input
              name="confirm_password"
              type="password"
              minLength={6}
              required
              autoComplete="new-password"
            />
          </div>
          {params.error ? (
            <p className="text-sm text-rose-400">{params.error}</p>
          ) : null}
          <Button type="submit" className="w-full">
            Сохранить пароль
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          <Link href="/login" className="hover:text-amber-300">
            Ко входу
          </Link>
        </p>
      </Card>
    </div>
  );
}
