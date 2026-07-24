import type { Discipline, DisciplineResult, OverallStanding, Team } from "@/types";

export function computeOverallStandings(
  teams: Team[],
  disciplines: Discipline[],
  results: DisciplineResult[],
): OverallStanding[] {
  const countingDisciplineIds = new Set(
    disciplines.filter((d) => d.counts_to_overall).map((d) => d.id),
  );

  const published = results.filter(
    (r) =>
      r.status === "published" &&
      r.place != null &&
      countingDisciplineIds.has(r.discipline_id),
  );

  const byTeam = new Map<string, OverallStanding>();

  for (const team of teams.filter((t) => t.is_active)) {
    byTeam.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      place_sum: 0,
      disciplines_count: 0,
      first_places: 0,
      second_places: 0,
      third_places: 0,
    });
  }

  for (const result of published) {
    const row = byTeam.get(result.team_id);
    if (!row || result.place == null) continue;

    row.place_sum += result.place;
    row.disciplines_count += 1;
    if (result.place === 1) row.first_places += 1;
    if (result.place === 2) row.second_places += 1;
    if (result.place === 3) row.third_places += 1;
  }

  return Array.from(byTeam.values())
    .filter((row) => row.disciplines_count > 0)
    .sort((a, b) => {
      if (a.place_sum !== b.place_sum) return a.place_sum - b.place_sum;
      if (a.first_places !== b.first_places) return b.first_places - a.first_places;
      if (a.second_places !== b.second_places) return b.second_places - a.second_places;
      if (a.third_places !== b.third_places) return b.third_places - a.third_places;
      return a.team_name.localeCompare(b.team_name, "ru");
    });
}
