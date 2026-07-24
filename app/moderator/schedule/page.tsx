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

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default async function ModeratorSchedulePage() {
  const profile = await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();

  const [{ data: events }, { data: teams }, { data: disciplines }] =
    await Promise.all([
      supabase.from("schedule_events").select("*").order("starts_at"),
      supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("disciplines").select("*").order("sort_order"),
    ]);

  return (
    <AppShell
      title="Расписание"
      role={profile.role}
      links={[
        { href: "/moderator", label: "Модератор" },
        { href: "/moderator/teams", label: "Команды" },
        { href: "/live/schedule", label: "Live-расписание" },
      ]}
    >
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
            <Label>Дата и время</Label>
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
            <Label>Статус</Label>
            <Select name="status" defaultValue="scheduled">
              {Object.entries(SCHEDULE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
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
                <Label>Дата и время</Label>
                <Input
                  name="starts_at"
                  type="datetime-local"
                  defaultValue={toLocalInputValue(event.starts_at)}
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
                <Label>Статус</Label>
                <Select name="status" defaultValue={event.status}>
                  {Object.entries(SCHEDULE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
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
