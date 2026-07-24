import { createClient } from "@/lib/supabase/server";
import { LiveStandingsBoard } from "@/components/live-boards";
import { PublicNav } from "@/components/public-nav";

export default async function LivePage() {
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
              Live
            </p>
            <h1 className="text-2xl font-bold md:text-4xl">Общий зачёт</h1>
            <p className="text-sm text-slate-400">
              Меньшая сумма мест — выше в таблице
            </p>
          </div>
          <PublicNav
            extraLinks={[
              { href: "/live/schedule", label: "Расписание" },
              { href: "/", label: "Главная" },
            ]}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <LiveStandingsBoard
          initialTeams={teams ?? []}
          initialDisciplines={disciplines ?? []}
          initialResults={results ?? []}
        />
      </main>
    </div>
  );
}
