import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell, Card } from "@/components/ui";
import { computeOverallStandings } from "@/lib/standings";

export default async function ModeratorResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const profile = await requireProfile(["admin", "moderator"]);
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: results }, { data: teams }, { data: disciplines }] =
    await Promise.all([
      supabase.from("discipline_results").select("*"),
      supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("disciplines")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

  const standingsMap = new Map(
    computeOverallStandings(
      teams ?? [],
      disciplines ?? [],
      results ?? [],
    ).map((row) => [row.team_id, row]),
  );

  const countingCount = (disciplines ?? []).filter((d) => d.counts_to_overall)
    .length;

  const teamRows = (teams ?? []).map((team) => {
    const standing = standingsMap.get(team.id);
    const teamResults = (results ?? []).filter((r) => r.team_id === team.id);
    const filled = teamResults.filter(
      (r) => r.place != null && r.status === "published",
    ).length;
    return {
      team,
      standing,
      filled,
      draftCount: teamResults.filter((r) => r.status === "draft").length,
    };
  });

  return (
    <AppShell
      title="Табло по командам"
      role={profile.role}
      links={[
        { href: "/moderator", label: "Модератор" },
        { href: "/judge", label: "По дисциплинам" },
        { href: "/tablo", label: "Публичное табло" },
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

      <Card className="mb-6">
        <p className="text-sm text-slate-400">
          Одна карточка = одна команда. Откройте команду, чтобы ввести места по
          всем дисциплинам. На публичном табло команды показываются одной
          строкой с суммой мест.
        </p>
      </Card>

      <div className="space-y-3">
        {teamRows.map(({ team, standing, filled, draftCount }) => (
          <Link
            key={team.id}
            href={`/moderator/results/${team.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-4 transition hover:border-amber-500/40"
          >
            <div>
              <p className="text-lg font-semibold">{team.name}</p>
              <p className="text-sm text-slate-400">
                Заполнено дисциплин: {filled}
                {countingCount > 0 ? ` / ${countingCount}` : ""}
                {draftCount > 0 ? ` · черновиков: ${draftCount}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Сумма мест
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {standing?.place_sum ?? "—"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
