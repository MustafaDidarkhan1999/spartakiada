import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell, Card } from "@/components/ui";
import { ROLE_LABELS } from "@/types";
import {
  adminResetPassword,
  assignJudge,
  createUser,
  removeJudgeAssignment,
  updateUserRole,
} from "@/app/actions";
import { Button, Input, Label, Select } from "@/components/ui";

type UserRow = {
  id: string;
  full_name: string | null;
  role: string;
  email: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const profile = await requireProfile(["admin"]);
  const supabase = await createClient();
  const params = await searchParams;

  const [{ data: profiles }, { data: disciplines }, { data: assignments }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("disciplines").select("*").order("sort_order"),
      supabase
        .from("judge_assignments")
        .select("*, profiles(full_name), disciplines(name)"),
    ]);

  let users: UserRow[] = (profiles ?? []).map((p) => ({
    ...p,
    email: "",
  }));

  try {
    const admin = createAdminClient();
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 200 });
    const emailMap = new Map(
      (authData?.users ?? []).map((u) => [u.id, u.email ?? ""]),
    );
    users = users.map((u) => ({ ...u, email: emailMap.get(u.id) ?? "" }));
  } catch {
    // service_role не задан — email не показываем
  }

  return (
    <AppShell
      title="Администрирование"
      role={profile.role}
      links={[
        { href: "/moderator", label: "Модератор" },
        { href: "/judge", label: "Судья" },
        { href: "/live", label: "Live" },
      ]}
    >
      {params.message ? (
        <p className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          {params.message}
        </p>
      ) : null}
      {params.error ? (
        <p className="mb-4 rounded-lg border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {params.error}
        </p>
      ) : null}

      <Card title="Создать пользователя" className="mb-6">
        <p className="mb-4 text-sm text-slate-400">
          Создайте аккаунт с временным паролем и передайте его судье или
          модератору. Пользователь сможет сменить пароль в разделе «Пароль» или
          через «Забыли пароль?» на странице входа.
        </p>
        <form action={createUser} className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>Имя</Label>
            <Input name="full_name" placeholder="Иван Иванов" />
          </div>
          <div>
            <Label>Временный пароль</Label>
            <Input name="password" type="text" minLength={6} required />
          </div>
          <div>
            <Label>Роль</Label>
            <Select name="role" defaultValue="judge">
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Создать
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Пользователи и роли">
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="space-y-3 rounded-xl border border-slate-800 p-4"
              >
                <form action={updateUserRole} className="grid gap-3 md:grid-cols-3">
                  <input type="hidden" name="user_id" value={user.id} />
                  <div>
                    <Label>Имя</Label>
                    <Input
                      name="full_name"
                      defaultValue={user.full_name ?? ""}
                    />
                    {user.email ? (
                      <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label>Роль</Label>
                    <Select name="role" defaultValue={user.role}>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full">
                      Сохранить
                    </Button>
                  </div>
                </form>

                <form
                  action={adminResetPassword}
                  className="grid gap-3 border-t border-slate-800 pt-3 md:grid-cols-3"
                >
                  <input type="hidden" name="user_id" value={user.id} />
                  <div className="md:col-span-2">
                    <Label>Новый пароль (сброс админом)</Label>
                    <Input
                      name="password"
                      type="text"
                      minLength={6}
                      placeholder="Минимум 6 символов"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="secondary" className="w-full">
                      Сбросить пароль
                    </Button>
                  </div>
                </form>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-slate-400">
                Пользователей пока нет. Создайте первого выше.
              </p>
            )}
          </div>
        </Card>

        <Card title="Назначение судей на дисциплины">
          <form action={assignJudge} className="mb-6 grid gap-3 md:grid-cols-3">
            <div>
              <Label>Судья</Label>
              <Select name="user_id" required>
                <option value="">Выберите</option>
                {users
                  .filter((u) => u.role === "judge" || u.role === "admin")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name ?? u.email ?? u.id}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label>Дисциплина</Label>
              <Select name="discipline_id" required>
                <option value="">Выберите</option>
                {(disciplines ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Назначить
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {(assignments ?? []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"
              >
                <span>
                  {(item.profiles as { full_name: string | null } | null)
                    ?.full_name ?? "—"}{" "}
                  →{" "}
                  {(item.disciplines as { name: string } | null)?.name ?? "—"}
                </span>
                <form action={removeJudgeAssignment}>
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="danger">
                    Убрать
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Быстрые ссылки" className="mt-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/moderator/teams" className="text-amber-300 hover:underline">
            Команды
          </Link>
          <Link
            href="/moderator/schedule"
            className="text-amber-300 hover:underline"
          >
            Расписание
          </Link>
          <Link href="/judge" className="text-amber-300 hover:underline">
            Панель судьи
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
