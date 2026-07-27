"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { SCHEDULE_STATUS_LABELS } from "@/types";
import type { Discipline, ScheduleEvent, Team, TournamentGroup } from "@/types";
import { deleteScheduleEvent, upsertScheduleEvent } from "@/app/actions";
import { eventDateInAlmaty, utcIsoToAlmatyLocalInput } from "@/lib/datetime";
import { getMatchScores } from "@/lib/match-score";

export function ModeratorScheduleList({
  events,
  teams,
  disciplines,
  groups,
}: {
  events: ScheduleEvent[];
  teams: Team[];
  disciplines: Discipline[];
  groups: TournamentGroup[];
}) {
  const [disciplineId, setDisciplineId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [onlyWithResult, setOnlyWithResult] = useState(false);

  const disciplineMap = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d.name])),
    [disciplines],
  );

  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (disciplineId && event.discipline_id !== disciplineId) return false;
      if (groupId && event.group_id !== groupId) return false;
      if (
        teamId &&
        event.team_a_id !== teamId &&
        event.team_b_id !== teamId
      ) {
        return false;
      }
      if (status && event.status !== status) return false;
      if (date && eventDateInAlmaty(event.starts_at) !== date) return false;
      if (onlyWithResult && !getMatchScores(event) && !event.result_text) {
        return false;
      }
      return true;
    });
  }, [events, disciplineId, groupId, teamId, status, date, onlyWithResult]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-3 lg:grid-cols-6">
        <select
          value={disciplineId}
          onChange={(e) => setDisciplineId(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="">Все дисциплины</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="">Все группы</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {(disciplineMap.get(g.discipline_id) ?? "") + " · " + g.name}
            </option>
          ))}
        </select>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="">Все команды</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          {Object.entries(SCHEDULE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={onlyWithResult}
            onChange={(e) => setOnlyWithResult(e.target.checked)}
          />
          Только со счётом
        </label>
      </div>

      <p className="text-sm text-slate-400">
        Показано: {filtered.length} из {events.length}
      </p>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-slate-400">Нет событий по выбранным фильтрам.</p>
        </Card>
      ) : (
        filtered.map((event) => (
          <Card key={event.id}>
            <form action={upsertScheduleEvent} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={event.id} />
              <div>
                <Label>Дисциплина</Label>
                <Select name="discipline_id" defaultValue={event.discipline_id ?? ""}>
                  <option value="">Без дисциплины</option>
                  {disciplines.map((d) => (
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
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {(disciplineMap.get(g.discipline_id) ?? "?") + " · " + g.name}
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
                  {teams.map((t) => (
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
                  {teams.map((t) => (
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
                <Input name="result_text" defaultValue={event.result_text ?? ""} />
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
        ))
      )}
    </div>
  );
}
