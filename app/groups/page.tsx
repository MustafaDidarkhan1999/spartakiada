import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicNav } from "@/components/public-nav";
import { computeGroupStandings } from "@/lib/group-standings";

const GROUP_DISCIPLINE_NAMES = ["Мини-футбол", "Волейбол"];

export default async function GroupsPage() {
  const supabase = await createClient();

  const [
    { data: disciplines },
    { data: groups },
    { data: members },
    { data: teams },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("disciplines")
      .select("*")
      .in("name", GROUP_DISCIPLINE_NAMES)
      .order("sort_order"),
    supabase.from("tournament_groups").select("*").order("sort_order").order("name"),
    supabase.from("group_teams").select("*").order("sort_order"),
    supabase.from("teams").select("*").eq("is_active", true),
    supabase.from("schedule_events").select("*").order("starts_at"),
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
              Состав и турнирная таблица · победа 3 · ничья 1 · поражение 0
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
                <div className="grid gap-6 lg:grid-cols-2">
                  {discGroups.map((group) => {
                    const groupMembers = (members ?? []).filter(
                      (m) => m.group_id === group.id,
                    );
                    const standings = computeGroupStandings(
                      group,
                      members ?? [],
                      teams ?? [],
                      events ?? [],
                    );

                    return (
                      <div
                        key={group.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                      >
                        <p className="mb-3 text-lg font-bold">
                          Группа {group.name}
                        </p>

                        <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                          Состав
                        </p>
                        <ol className="mb-5 space-y-1 text-sm">
                          {groupMembers.length === 0 ? (
                            <li className="text-slate-500">Пока пусто</li>
                          ) : (
                            groupMembers.map((m, idx) => (
                              <li key={m.id} className="flex gap-2">
                                <span className="text-slate-500">{idx + 1}.</span>
                                <span>{teamMap.get(m.team_id) ?? "—"}</span>
                              </li>
                            ))
                          )}
                        </ol>

                        <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                          Турнирная таблица
                        </p>
                        {standings.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            Нет команд или результатов матчей.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[420px] text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-700 text-slate-400">
                                  <th className="py-2 pr-2">#</th>
                                  <th className="py-2 pr-2">Команда</th>
                                  <th className="py-2 px-1 text-center">И</th>
                                  <th className="py-2 px-1 text-center">В</th>
                                  <th className="py-2 px-1 text-center">Н</th>
                                  <th className="py-2 px-1 text-center">П</th>
                                  <th className="py-2 px-1 text-center">Мячи</th>
                                  <th className="py-2 pl-2 text-right">О</th>
                                </tr>
                              </thead>
                              <tbody>
                                {standings.map((row, idx) => (
                                  <tr
                                    key={row.team_id}
                                    className="border-b border-slate-800/80"
                                  >
                                    <td className="py-2 pr-2 text-slate-500">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2 pr-2 font-medium">
                                      {row.team_name}
                                    </td>
                                    <td className="py-2 px-1 text-center">
                                      {row.played}
                                    </td>
                                    <td className="py-2 px-1 text-center">
                                      {row.wins}
                                    </td>
                                    <td className="py-2 px-1 text-center">
                                      {row.draws}
                                    </td>
                                    <td className="py-2 px-1 text-center">
                                      {row.losses}
                                    </td>
                                    <td className="py-2 px-1 text-center tabular-nums">
                                      {row.goals_for}:{row.goals_against}
                                    </td>
                                    <td className="py-2 pl-2 text-right font-bold text-emerald-400">
                                      {row.points}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        <p className="text-center text-sm text-slate-500">
          Очки считаются из всех матчей команды в этой дисциплине (в том числе
          против соперников из других групп).{" "}
          <Link href="/schedule" className="text-amber-300 hover:underline">
            Смотреть расписание →
          </Link>
        </p>
      </main>
    </div>
  );
}
