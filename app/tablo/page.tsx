import { createClient } from "@/lib/supabase/server";
import { StandingsBoard } from "@/components/live-boards";
import { PublicNav } from "@/components/public-nav";

export default async function TabloPage() {
  const supabase = await createClient();

  const [{ data: teams }, { data: disciplines }, { data: results }] =
    await Promise.all([
      supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("disciplines").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("discipline_results")
        .select("*")
        .eq("status", "published"),
    ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
              Спартакиада 2026
            </p>
            <h1 className="text-2xl font-bold md:text-4xl">Табло</h1>
            <p className="text-sm text-slate-400">
              Общий зачёт: одна строка на команду · сумма мест по дисциплинам
              (меньше — выше)
            </p>
          </div>
          <PublicNav
            extraLinks={[
              { href: "/schedule", label: "Расписание" },
              { href: "/display", label: "ТВ-режим" },
              { href: "/", label: "Главная" },
            ]}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <StandingsBoard
          initialTeams={teams ?? []}
          initialDisciplines={disciplines ?? []}
          initialResults={results ?? []}
        />
      </main>
    </div>
  );
}
