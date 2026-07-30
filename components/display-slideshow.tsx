"use client";

import { useEffect, useState } from "react";
import { StandingsBoard, ScheduleBoard } from "@/components/live-boards";
import type {
  Discipline,
  DisciplineResult,
  OverallPlace,
  ScheduleEvent,
  Team,
} from "@/types";
import type { OverallMode } from "@/lib/standings";

const SLIDE_MS = 20_000;

export function DisplaySlideshow({
  teams,
  disciplines,
  results,
  events,
  overallPlaces = [],
  overallMode = "auto",
}: {
  teams: Team[];
  disciplines: Discipline[];
  results: DisciplineResult[];
  events: ScheduleEvent[];
  overallPlaces?: OverallPlace[];
  overallMode?: OverallMode;
}) {
  const [slide, setSlide] = useState<"tablo" | "schedule">("tablo");
  const [secondsLeft, setSecondsLeft] = useState(SLIDE_MS / 1000);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setSlide((prev) => (prev === "tablo" ? "schedule" : "tablo"));
          return SLIDE_MS / 1000;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
              Integra Construction KZ · ТВ
            </p>
            <h1 className="text-3xl font-bold md:text-5xl">
              {slide === "tablo" ? "Табло" : "Расписание"}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Смена через</p>
            <p className="text-2xl font-semibold text-amber-300">{secondsLeft}с</p>
            <div className="mt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setSlide("tablo");
                  setSecondsLeft(SLIDE_MS / 1000);
                }}
                className={`rounded-lg px-3 py-1 text-sm ${slide === "tablo" ? "bg-amber-500 text-slate-950" : "border border-slate-700"}`}
              >
                Табло
              </button>
              <button
                type="button"
                onClick={() => {
                  setSlide("schedule");
                  setSecondsLeft(SLIDE_MS / 1000);
                }}
                className={`rounded-lg px-3 py-1 text-sm ${slide === "schedule" ? "bg-amber-500 text-slate-950" : "border border-slate-700"}`}
              >
                Расписание
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {slide === "tablo" ? (
          <StandingsBoard
            initialTeams={teams}
            initialDisciplines={disciplines}
            initialResults={results}
            initialOverallPlaces={overallPlaces}
            initialOverallMode={overallMode}
            compact
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
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
            <ScheduleBoard
              initialEvents={events}
              initialTeams={teams}
              initialDisciplines={disciplines}
              showFilters={false}
              compact
            />
          </div>
        )}
      </main>
    </div>
  );
}
