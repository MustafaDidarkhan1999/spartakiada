import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell, Button, Card, Input, Label } from "@/components/ui";
import { deleteTeam, upsertTeam } from "@/app/actions";

export default async function ModeratorTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const profile = await requireProfile(["admin", "moderator"]);
  const params = await searchParams;
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <AppShell
      title="Команды"
      role={profile.role}
      links={[
        { href: "/moderator", label: "Модератор" },
        { href: "/moderator/schedule", label: "Расписание" },
        { href: "/tablo", label: "Табло" },
        { href: "/judge", label: "Оценки" },
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

      <Card title="Добавить команду" className="mb-6">
        <form action={upsertTeam} className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Название</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>Короткое имя</Label>
            <Input name="short_name" />
          </div>
          <div>
            <Label>Порядок</Label>
            <Input name="sort_order" type="number" defaultValue={0} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Добавить
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {(teams ?? []).map((team) => (
          <Card key={team.id}>
            <form action={upsertTeam} className="grid gap-3 md:grid-cols-5">
              <input type="hidden" name="id" value={team.id} />
              <div>
                <Label>Название</Label>
                <Input name="name" defaultValue={team.name} required />
              </div>
              <div>
                <Label>Короткое имя</Label>
                <Input name="short_name" defaultValue={team.short_name ?? ""} />
              </div>
              <div>
                <Label>Порядок</Label>
                <Input
                  name="sort_order"
                  type="number"
                  defaultValue={team.sort_order}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Сохранить
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  formAction={deleteTeam}
                  type="submit"
                  variant="danger"
                  className="w-full"
                >
                  Скрыть
                </Button>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
