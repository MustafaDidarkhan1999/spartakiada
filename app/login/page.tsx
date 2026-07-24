import { redirect } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/app/actions";
import { getProfile, roleHomePath } from "@/lib/auth";
import { Button, Card, Input, Label } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();

  if (profile) {
    redirect(roleHomePath(profile.role));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md" title="Вход в систему">
        <form action={signIn} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label>Пароль</Label>
            <Input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {params.error ? (
            <p className="text-sm text-rose-400">{params.error}</p>
          ) : null}
          {params.message ? (
            <p className="text-sm text-emerald-400">{params.message}</p>
          ) : null}
          <Button type="submit" className="w-full">
            Войти
          </Button>
        </form>
        <div className="mt-4 space-y-2 text-center text-sm text-slate-400">
          <p>
            <Link href="/auth/forgot-password" className="hover:text-amber-300">
              Забыли пароль?
            </Link>
          </p>
          <p>
            <Link href="/" className="hover:text-amber-300">
              На главную
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
