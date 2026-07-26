import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  AppShell,
  Button,
  Card,
  Input,
  Label,
  Select,
} from "@/components/ui";
import {
  addTeamToGroup,
  deleteTournamentGroup,
  removeTeamFromGroup,
  upsertTournamentGroup,
} from "@/app/actions";

const GROUP_DISCIPLINE_NAMES = ["Мини-футбол", "Волейбол"];

export default async function ModeratorGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const profile = await requireProfile(["admin", "moderator"]);
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: disciplines }, { data: teams }, { data: groups }, { data: members }] =
    await Promise.all([
      supabase
        .from("disciplines")
        .select("*")
        .in("name", GROUP_DISCIPLINE_NAMES)
        .order("sort_order"),
      supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("tournament_groups")
        .select("*")
        .order("sort_order")
        .order("name"),
      supabase.from("group_teams").select("*").order("sort_order"),
    ]);

  const disciplineIds = new Set((disciplines ?? []).map((d) => d.id));
  const filteredGroups = (groups ?? []).filter((g) =>
    disciplineIds.has(g.discipline_id),
  );

  const membersByGroup = new Map<string, typeof members>();
  for (const m of members ?? []) {
    const list = membersByGroup.get(m.group_id) ?? [];
    list.push(m);
    membersByGroup.set(m.group_id, list);
  }

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <AppShell
      title="Группы (футбол / волейбол)"
      role={profile.role}
      links={[
        { href: "/moderator", label: "Модератор" },
        { href: "/moderator/schedule", label: "Расписание" },
        { href: "/groups", label: "Публичные группы" },
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

      <Card className="mb-6">
        <p className="text-sm text-slate-400">
          Создайте группы (A, B, C, D, A1, A2…) и добавьте команды. Обычно по 4
          команды в группе; для волейбола в одной группе можно поставить лимит 3.
          Одна команда — только в одной группе внутри дисциплины.
        </p>
      </Card>

      <Card title="Новая группа" className="mb-6">
        <form
          action={upsertTournamentGroup}
          className="grid gap-3 md:grid-cols-5"
        >
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
          <div>
            <Label>Название</Label>
            <Input name="name" placeholder="A / B / A1" required />
          </div>
          <div>
            <Label>Макс. команд</Label>
            <Input name="max_teams" type="number" min={1} max={16} defaultValue={4} />
          </div>
          <div>
            <Label>Порядок</Label>
            <Input name="sort_order" type="number" defaultValue={0} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Создать
            </Button>
          </div>
        </form>
      </Card>

      {(disciplines ?? []).length === 0 ? (
        <Card>
          <p className="text-rose-300 text-sm">
            Не найдены дисциплины «Мини-футбол» / «Волейбол». Проверьте названия
            в базе.
          </p>
        </Card>
      ) : null}

      <div className="space-y-6">
        {(disciplines ?? []).map((discipline) => {
          const discGroups = filteredGroups.filter(
            (g) => g.discipline_id === discipline.id,
          );

          return (
            <section key={discipline.id}>
              <h2 className="mb-3 text-xl font-semibold text-amber-300">
                {discipline.name}
              </h2>
              {discGroups.length === 0 ? (
                <Card>
                  <p className="text-sm text-slate-400">
                    Групп пока нет — создайте A, B, C, D выше.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {discGroups.map((group) => {
                    const groupMembers = membersByGroup.get(group.id) ?? [];
                    const takenIds = new Set(groupMembers.map((m) => m.team_id));
                    const assignedInDiscipline = new Set(
                      (members ?? [])
                        .filter((m) => m.discipline_id === discipline.id)
                        .map((m) => m.team_id),
                    );
                    const available = (teams ?? []).filter(
                      (t) =>
                        !takenIds.has(t.id) && !assignedInDiscipline.has(t.id),
                    );

                    return (
                      <Card key={group.id}>
                        <form
                          action={upsertTournamentGroup}
                          className="mb-4 grid gap-2 md:grid-cols-4"
                        >
                          <input type="hidden" name="id" value={group.id} />
                          <input
                            type="hidden"
                            name="discipline_id"
                            value={group.discipline_id}
                          />
                          <div>
                            <Label>Группа</Label>
                            <Input name="name" defaultValue={group.name} required />
                          </div>
                          <div>
                            <Label>Макс.</Label>
                            <Input
                              name="max_teams"
                              type="number"
                              min={1}
                              defaultValue={group.max_teams}
                            />
                          </div>
                          <div>
                            <Label>Порядок</Label>
                            <Input
                              name="sort_order"
                              type="number"
                              defaultValue={group.sort_order}
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <Button type="submit" className="w-full">
                              Сохранить
                            </Button>
                            <Button
                              formAction={deleteTournamentGroup}
                              type="submit"
                              variant="danger"
                            >
                              ×
                            </Button>
                          </div>
                        </form>

                        <p className="mb-2 text-sm text-slate-400">
                          Команды: {groupMembers.length} / {group.max_teams}
                        </p>
                        <ul className="mb-3 space-y-2">
                          {groupMembers.map((m) => (
                            <li
                              key={m.id}
                              className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"
                            >
                              <span>{teamMap.get(m.team_id) ?? m.team_id}</span>
                              <form action={removeTeamFromGroup}>
                                <input type="hidden" name="id" value={m.id} />
                                <Button type="submit" variant="danger">
                                  Убрать
                                </Button>
                              </form>
                            </li>
                          ))}
                        </ul>

                        {groupMembers.length < group.max_teams ? (
                          <form
                            action={addTeamToGroup}
                            className="flex gap-2"
                          >
                            <input type="hidden" name="group_id" value={group.id} />
                            <Select name="team_id" required className="flex-1">
                              <option value="">Добавить команду</option>
                              {available.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </Select>
                            <Button type="submit">+</Button>
                          </form>
                        ) : (
                          <p className="text-xs text-slate-500">Группа заполнена</p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
