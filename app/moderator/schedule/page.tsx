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
import { SCHEDULE_STATUS_LABELS } from "@/types";
import { deleteScheduleEvent, upsertScheduleEvent } from "@/app/actions";
import { utcIsoToAlmatyLocalInput } from "@/lib/datetime";

export default async function ModeratorSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const profile = await requireProfile(["admin", "moderator"]);
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: events }, { data: teams }, { data: disciplines }, { data: groups }] =
    await Promise.all([
      supabase.from("schedule_events").select("*").order("starts_at"),
      supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("disciplines").select("*").order("sort_order"),
      supabase.from("tournament_groups").select("*").order("sort_order").order("name"),
    ]);

  return (
    <AppShell
      title="Расписание"
      role={profile.role}
      links={[
        { href: "/moderator", label: "Модератор" },
        { href: "/moderator/teams", label: "Команды" },
        { href: "/moderator/groups", label: "Группы" },
        { href: "/judge", label: "Оценки" },
        { href: "/schedule", label: "Публичное расписание" },
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

      <Card title="Новое событие" className="mb-6">
        <form action={upsertScheduleEvent} className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Дисциплина</Label>
            <Select name="discipline_id">
              <option value="">Без дисциплины</option>
              {(disciplines ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Группа (футбол/волейбол)</Label>
            <Select name="group_id">
              <option value="">Без группы</option>
              {(groups ?? []).map((g) => {
                const disc = (disciplines ?? []).find((d) => d.id === g.discipline_id);
                return (
                  <option key={g.id} value={g.id}>
                    {disc?.name ?? "?"} · {g.name}
                  </option>
                );
              })}
            </Select>
          </div>
          <div>
            <Label>Название (если не матч)</Label>
            <Input name="title" placeholder="Церемония открытия" />
          </div>
          <div>
            <Label>Команда A</Label>
            <Select name="team_a_id">
              <option value="">—</option>
              {(teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Команда B</Label>
            <Select name="team_b_id">
              <option value="">—</option>
              {(teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Дата и время (время Казахстана, Алматы)</Label>
            <Input name="starts_at" type="datetime-local" required />
          </div>
          <div>
            <Label>Локация</Label>
            <Input name="location" />
          </div>
          <div>
            <Label>Раунд</Label>
            <Input name="round_label" placeholder="Группа A / 1/4 финала" />
          </div>
          <div>
            <Label>Вес (кг)</Label>
            <Input name="weight_kg" type="number" step="0.1" placeholder="70" />
          </div>
          <div>
            <Label>Весовая категория</Label>
            <label className="mt-1 flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_absolute" value="true" />
              Абсолютка
            </label>
          </div>
          <div>
            <Label>Статус</Label>
            <Select name="status" defaultValue="scheduled">
              {Object.entries(SCHEDULE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Счёт команды A</Label>
            <Input name="score_a" type="number" step="0.01" />
          </div>
          <div>
            <Label>Счёт команды B</Label>
            <Input name="score_b" type="number" step="0.01" />
          </div>
          <div className="md:col-span-2">
            <Label>Результат текстом (если не матч 1×1)</Label>
            <Input name="result_text" placeholder="Например: 2:1 / победа по пенальти" />
          </div>
          <div className="md:col-span-2">
            <Label>Заметки</Label>
            <Input name="notes" />
          </div>
          <div>
            <Button type="submit">Добавить в расписание</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {(events ?? []).map((event) => (
          <Card key={event.id}>
            <form action={upsertScheduleEvent} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={event.id} />
              <div>
                <Label>Дисциплина</Label>
                <Select name="discipline_id" defaultValue={event.discipline_id ?? ""}>
                  <option value="">Без дисциплины</option>
                  {(disciplines ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Группа</Label>
                <Select name="group_id" defaultValue={event.group_id ?? ""}>
                  <option value="">Без группы</option>
                  {(groups ?? []).map((g) => {
                    const disc = (disciplines ?? []).find(
                      (d) => d.id === g.discipline_id,
                    );
                    return (
                      <option key={g.id} value={g.id}>
                        {disc?.name ?? "?"} · {g.name}
                      </option>
                    );
                  })}
                </Select>
              </div>
              <div>
                <Label>Название</Label>
                <Input name="title" defaultValue={event.title ?? ""} />
              </div>
              <div>
                <Label>Команда A</Label>
                <Select name="team_a_id" defaultValue={event.team_a_id ?? ""}>
                  <option value="">—</option>
                  {(teams ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Команда B</Label>
                <Select name="team_b_id" defaultValue={event.team_b_id ?? ""}>
                  <option value="">—</option>
                  {(teams ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Дата и время (Алматы)</Label>
                <Input
                  name="starts_at"
                  type="datetime-local"
                  defaultValue={utcIsoToAlmatyLocalInput(event.starts_at)}
                  required
                />
              </div>
              <div>
                <Label>Локация</Label>
                <Input name="location" defaultValue={event.location ?? ""} />
              </div>
              <div>
                <Label>Раунд</Label>
                <Input name="round_label" defaultValue={event.round_label ?? ""} />
              </div>
              <div>
                <Label>Вес (кг)</Label>
                <Input
                  name="weight_kg"
                  type="number"
                  step="0.1"
                  defaultValue={event.weight_kg ?? ""}
                />
              </div>
              <div>
                <Label>Весовая категория</Label>
                <label className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    name="is_absolute"
                    value="true"
                    defaultChecked={event.is_absolute ?? false}
                  />
                  Абсолютка
                </label>
              </div>
              <div>
                <Label>Статус</Label>
                <Select name="status" defaultValue={event.status}>
                  {Object.entries(SCHEDULE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Счёт A</Label>
                <Input
                  name="score_a"
                  type="number"
                  step="0.01"
                  defaultValue={event.score_a ?? ""}
                />
              </div>
              <div>
                <Label>Счёт B</Label>
                <Input
                  name="score_b"
                  type="number"
                  step="0.01"
                  defaultValue={event.score_b ?? ""}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Результат текстом</Label>
                <Input
                  name="result_text"
                  defaultValue={event.result_text ?? ""}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Заметки</Label>
                <Input name="notes" defaultValue={event.notes ?? ""} />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Сохранить</Button>
                <Button formAction={deleteScheduleEvent} type="submit" variant="danger">
                  Удалить
                </Button>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
