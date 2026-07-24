import { requireProfile } from "@/lib/auth";
import { changeOwnPassword } from "@/app/actions";
import { AppShell, Button, Card, Input, Label } from "@/components/ui";

export default async function SettingsPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const profile = await requireProfile(["admin", "moderator", "judge"]);
  const params = await searchParams;

  return (
    <AppShell title="Смена пароля" role={profile.role} links={[]}>
      <Card className="max-w-lg">
        <p className="mb-4 text-sm text-slate-400">
          Введите текущий пароль и новый. Минимум 6 символов.
        </p>
        <form action={changeOwnPassword} className="space-y-4">
          <div>
            <Label>Текущий пароль</Label>
            <Input
              name="current_password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label>Новый пароль</Label>
            <Input
              name="new_password"
              type="password"
              minLength={6}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label>Повторите новый пароль</Label>
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
          {params.message ? (
            <p className="text-sm text-emerald-400">{params.message}</p>
          ) : null}
          <Button type="submit">Сохранить</Button>
        </form>
      </Card>
    </AppShell>
  );
}
