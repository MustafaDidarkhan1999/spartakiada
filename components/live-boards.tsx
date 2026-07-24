"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DisciplineResult, ScheduleEvent, Team } from "@/types";
import { computeOverallStandings } from "@/lib/standings";
import type { Discipline } from "@/types";
import { SCHEDULE_STATUS_LABELS } from "@/types";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function LiveStandingsBoard({
  initialTeams,
  initialDisciplines,
  initialResults,
}: {
  initialTeams: Team[];
  initialDisciplines: Discipline[];
  initialResults: DisciplineResult[];
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [disciplines] = useState(initialDisciplines);
  const [results, setResults] = useState(initialResults);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("live-results")
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
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-lg font-bold text-amber-300">
                {index + 1}
              </span>
              <div>
                <p className="text-xl font-semibold">{row.team_name}</p>
                <p className="text-sm text-slate-400">
                  Дисциплин: {row.disciplines_count} · 1-е места: {row.first_places}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Сумма мест
              </p>
              <p className="text-3xl font-bold text-emerald-400">{row.place_sum}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function LiveScheduleBoard({
  initialEvents,
  initialTeams,
  initialDisciplines,
}: {
  initialEvents: ScheduleEvent[];
  initialTeams: Team[];
  initialDisciplines: Discipline[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const teamMap = new Map(initialTeams.map((t) => [t.id, t.name]));
  const disciplineMap = new Map(initialDisciplines.map((d) => [d.id, d.name]));

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("live-schedule")
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

  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <p className="text-slate-400">Расписание пока пустое.</p>
      ) : (
        events.map((event) => {
          const teamA = event.team_a_id ? teamMap.get(event.team_a_id) : null;
          const teamB = event.team_b_id ? teamMap.get(event.team_b_id) : null;
          const discipline = event.discipline_id
            ? disciplineMap.get(event.discipline_id)
            : null;

          return (
            <div
              key={event.id}
              className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 md:grid-cols-[140px_1fr_120px]"
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
                  {event.round_label ? ` · ${event.round_label}` : ""}
                </p>
                <p className="text-lg font-medium">
                  {teamA && teamB ? `${teamA} — ${teamB}` : (event.title ?? "—")}
                </p>
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
  );
}
