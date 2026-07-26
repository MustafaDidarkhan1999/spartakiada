"use client";

import { useEffect, useState } from "react";
import { StandingsBoard, ScheduleBoard } from "@/components/live-boards";
import type { Discipline, DisciplineResult, ScheduleEvent, Team } from "@/types";

const SLIDE_MS = 20_000;

export function DisplaySlideshow({
  teams,
  disciplines,
  results,
  events,
}: {
  teams: Team[];
  disciplines: Discipline[];
  results: DisciplineResult[];
  events: ScheduleEvent[];
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
            compact
          />
        ) : (
          <ScheduleBoard
            initialEvents={events}
            initialTeams={teams}
            initialDisciplines={disciplines}
            showFilters={false}
            compact
          />
        )}
      </main>
    </div>
  );
}
