import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicNav } from "@/components/public-nav";

const GROUP_DISCIPLINE_NAMES = ["Мини-футбол", "Волейбол"];

export default async function GroupsPage() {
  const supabase = await createClient();

  const [{ data: disciplines }, { data: groups }, { data: members }, { data: teams }] =
    await Promise.all([
      supabase
        .from("disciplines")
        .select("*")
        .in("name", GROUP_DISCIPLINE_NAMES)
        .order("sort_order"),
      supabase.from("tournament_groups").select("*").order("sort_order").order("name"),
      supabase.from("group_teams").select("*").order("sort_order"),
      supabase.from("teams").select("*").eq("is_active", true),
    ]);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const disciplineIds = new Set((disciplines ?? []).map((d) => d.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
              Спартакиада 2026
            </p>
            <h1 className="text-2xl font-bold md:text-4xl">Группы</h1>
            <p className="text-sm text-slate-400">
              Мини-футбол и волейбол · групповой этап
            </p>
          </div>
          <PublicNav
            extraLinks={[
              { href: "/tablo", label: "Табло" },
              { href: "/schedule", label: "Расписание" },
              { href: "/", label: "Главная" },
            ]}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        {(disciplines ?? []).map((discipline) => {
          const discGroups = (groups ?? []).filter(
            (g) =>
              g.discipline_id === discipline.id &&
              disciplineIds.has(g.discipline_id),
          );

          return (
            <section key={discipline.id}>
              <h2 className="mb-4 text-2xl font-semibold text-amber-300">
                {discipline.name}
              </h2>
              {discGroups.length === 0 ? (
                <p className="text-slate-400">Группы ещё не сформированы.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {discGroups.map((group) => {
                    const groupMembers = (members ?? []).filter(
                      (m) => m.group_id === group.id,
                    );
                    return (
                      <div
                        key={group.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                      >
                        <p className="mb-3 text-lg font-bold">
                          Группа {group.name}
                        </p>
                        <ol className="space-y-2 text-sm">
                          {groupMembers.length === 0 ? (
                            <li className="text-slate-500">Пока пусто</li>
                          ) : (
                            groupMembers.map((m, idx) => (
                              <li
                                key={m.id}
                                className="flex gap-2 border-b border-slate-800/80 pb-2 last:border-0"
                              >
                                <span className="text-slate-500">{idx + 1}.</span>
                                <span>{teamMap.get(m.team_id) ?? "—"}</span>
                              </li>
                            ))
                          )}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        <p className="text-center text-sm text-slate-500">
          <Link href="/schedule" className="text-amber-300 hover:underline">
            Смотреть расписание матчей →
          </Link>
        </p>
      </main>
    </div>
  );
}
