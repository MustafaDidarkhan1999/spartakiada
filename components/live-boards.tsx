"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Discipline,
  DisciplineResult,
  ScheduleEvent,
  Team,
  TournamentGroup,
} from "@/types";
import { computeOverallStandings } from "@/lib/standings";
import { SCHEDULE_STATUS_LABELS } from "@/types";
import { eventDateInAlmaty, formatEventDateTime } from "@/lib/datetime";
import { getMatchScores } from "@/lib/match-score";

function formatDateTime(value: string) {
  return formatEventDateTime(value);
}

function formatScore(event: ScheduleEvent) {
  if (event.result_text) return event.result_text;
  const scores = getMatchScores(event);
  if (scores) return `${scores.a} : ${scores.b}`;
  return null;
}

function formatWeightCategory(event: ScheduleEvent) {
  if (event.is_absolute) return "Абсолютка";
  if (event.weight_kg != null) return `${event.weight_kg} кг`;
  return null;
}

export function StandingsBoard({
  initialTeams,
  initialDisciplines,
  initialResults,
  compact = false,
}: {
  initialTeams: Team[];
  initialDisciplines: Discipline[];
  initialResults: DisciplineResult[];
  compact?: boolean;
}) {
  const [teams] = useState(initialTeams);
  const [disciplines] = useState(initialDisciplines);
  const [results, setResults] = useState(initialResults);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("standings-results")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discipline_results" },
        async () => {
          const { data } = await supabase
            .from("discipline_results")
            .select("*")
            .eq("status", "published");
          if (data) setResults(data as DisciplineResult[]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const standings = computeOverallStandings(teams, disciplines, results);

  return (
    <div className="space-y-3">
      {standings.length === 0 ? (
        <p className="text-slate-400">Пока нет опубликованных результатов.</p>
      ) : (
        standings.map((row, index) => (
          <div
            key={row.team_id}
            className={`flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 ${compact ? "px-4 py-3" : "px-5 py-4"}`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`flex items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-300 ${compact ? "h-9 w-9 text-base" : "h-10 w-10 text-lg"}`}
              >
                {index + 1}
              </span>
              <div>
                <p className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>
                  {row.team_name}
                </p>
                <p className="text-sm text-slate-400">
                  Дисциплин: {row.disciplines_count} · 1-е места: {row.first_places}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Сумма мест
              </p>
              <p
                className={`font-bold text-emerald-400 ${compact ? "text-2xl" : "text-3xl"}`}
              >
                {row.place_sum}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function ScheduleBoard({
  initialEvents,
  initialTeams,
  initialDisciplines,
  initialGroups = [],
  showFilters = true,
  compact = false,
}: {
  initialEvents: ScheduleEvent[];
  initialTeams: Team[];
  initialDisciplines: Discipline[];
  initialGroups?: TournamentGroup[];
  showFilters?: boolean;
  compact?: boolean;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [disciplineId, setDisciplineId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [onlyWithResult, setOnlyWithResult] = useState(false);

  const teamMap = useMemo(
    () => new Map(initialTeams.map((t) => [t.id, t.name])),
    [initialTeams],
  );
  const disciplineMap = useMemo(
    () => new Map(initialDisciplines.map((d) => [d.id, d.name])),
    [initialDisciplines],
  );
  const groupMap = useMemo(
    () => new Map(initialGroups.map((g) => [g.id, g.name])),
    [initialGroups],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("public-schedule")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_events" },
        async () => {
          const { data } = await supabase
            .from("schedule_events")
            .select("*")
            .order("starts_at", { ascending: true });
          if (data) setEvents(data as ScheduleEvent[]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = events.filter((event) => {
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
    if (date) {
      if (eventDateInAlmaty(event.starts_at) !== date) return false;
    }
    if (onlyWithResult) {
      const hasResult = formatScore(event) != null;
      if (!hasResult) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {showFilters ? (
        <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-3 lg:grid-cols-6">
          <select
            value={disciplineId}
            onChange={(e) => setDisciplineId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="">Все дисциплины</option>
            {initialDisciplines.map((d) => (
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
            {initialGroups.map((g) => (
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
            {initialTeams.map((t) => (
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
      ) : null}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-slate-400">Нет событий по выбранным фильтрам.</p>
        ) : (
          filtered.map((event) => {
            const teamA = event.team_a_id ? teamMap.get(event.team_a_id) : null;
            const teamB = event.team_b_id ? teamMap.get(event.team_b_id) : null;
            const discipline = event.discipline_id
              ? disciplineMap.get(event.discipline_id)
              : null;
            const groupName = event.group_id
              ? groupMap.get(event.group_id)
              : null;
            const score = formatScore(event);
            const weightCategory = formatWeightCategory(event);

            return (
              <div
                key={event.id}
                className={`grid gap-3 rounded-xl border border-slate-800 bg-slate-900/80 ${compact ? "p-3" : "p-4"} md:grid-cols-[140px_1fr_auto_120px]`}
              >
                <div>
                  <p className="text-lg font-semibold text-amber-300">
                    {formatDateTime(event.starts_at)}
                  </p>
                  {event.location ? (
                    <p className="text-sm text-slate-400">{event.location}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-sm text-slate-400">
                    {discipline ?? event.title ?? "Событие"}
                    {groupName ? ` · группа ${groupName}` : ""}
                    {weightCategory ? ` · ${weightCategory}` : ""}
                    {event.round_label ? ` · ${event.round_label}` : ""}
                  </p>
                  <p className="text-lg font-medium">
                    {teamA && teamB
                      ? `${teamA} — ${teamB}`
                      : (event.title ?? "—")}
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  {score ? (
                    <p className="text-2xl font-bold text-emerald-400">{score}</p>
                  ) : (
                    <p className="text-sm text-slate-500">—</p>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${
                      event.status === "live"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800"
                    }`}
                  >
                    {SCHEDULE_STATUS_LABELS[event.status]}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** @deprecated use StandingsBoard */
export const LiveStandingsBoard = StandingsBoard;
/** @deprecated use ScheduleBoard */
export const LiveScheduleBoard = ScheduleBoard;
