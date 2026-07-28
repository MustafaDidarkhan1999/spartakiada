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
import { upsertScheduleEvent } from "@/app/actions";
import { ModeratorScheduleList } from "@/components/moderator-schedule-list";

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
        { href: "/groups", label: "Таблицы групп" },
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

      <div className="mb-6 flex flex-wrap gap-3">
        <a
          href="https://challonge.com/ru/integracs2"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
        >
          Киберспорт: сетка и расписание
        </a>
        <a
          href="https://s2.chess-results.com/tnr1465326.aspx?lan=1&art=3&rd=1&SNode=S0"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-amber-500/50"
        >
          Шахматы: турнирная таблица
        </a>
      </div>

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

      <h2 className="mb-3 text-lg font-semibold text-amber-300">События</h2>
      <ModeratorScheduleList
        events={events ?? []}
        teams={teams ?? []}
        disciplines={disciplines ?? []}
        groups={groups ?? []}
      />
    </AppShell>
  );
}
