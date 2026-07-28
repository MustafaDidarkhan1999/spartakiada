import type { GroupTeam, ScheduleEvent, Team, TournamentGroup } from "@/types";
import { getMatchScores } from "@/lib/match-score";

export type GroupStandingRow = {
  team_id: string;
  team_name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};

/**
 * Group table: win = 3, draw = 1, loss = 0.
 * Every match with a score counts for group members who played,
 * including games vs teams from other groups.
 */
export function computeGroupStandings(
  group: TournamentGroup,
  members: GroupTeam[],
  teams: Team[],
  events: ScheduleEvent[],
): GroupStandingRow[] {
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));
  const memberIds = members
    .filter((m) => m.group_id === group.id)
    .map((m) => m.team_id);

  const rows = new Map<string, GroupStandingRow>();
  for (const teamId of memberIds) {
    rows.set(teamId, {
      team_id: teamId,
      team_name: teamMap.get(teamId) ?? "—",
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_diff: 0,
      points: 0,
    });
  }

  const memberIdSet = new Set(memberIds);

  const relevant = events.filter((event) => {
    if (event.status === "cancelled" || event.status === "postponed") return false;
    if (!event.team_a_id || !event.team_b_id) return false;
    if (getMatchScores(event) == null) return false;

    if (
      event.discipline_id != null &&
      event.discipline_id !== group.discipline_id
    ) {
      return false;
    }

    return (
      memberIdSet.has(event.team_a_id) || memberIdSet.has(event.team_b_id)
    );
  });

  function applyResult(
    row: GroupStandingRow,
    goalsFor: number,
    goalsAgainst: number,
  ) {
    row.played += 1;
    row.goals_for += goalsFor;
    row.goals_against += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      row.wins += 1;
      row.points += 3;
    } else if (goalsFor < goalsAgainst) {
      row.losses += 1;
    } else {
      row.draws += 1;
      row.points += 1;
    }
  }

  for (const event of relevant) {
    const scores = getMatchScores(event);
    if (!scores || !event.team_a_id || !event.team_b_id) continue;

    const rowA = rows.get(event.team_a_id);
    const rowB = rows.get(event.team_b_id);

    if (rowA) applyResult(rowA, scores.a, scores.b);
    if (rowB) applyResult(rowB, scores.b, scores.a);
  }

  for (const row of rows.values()) {
    row.goal_diff = row.goals_for - row.goals_against;
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goal_diff !== b.goal_diff) return b.goal_diff - a.goal_diff;
    if (a.goals_for !== b.goals_for) return b.goals_for - a.goals_for;
    return a.team_name.localeCompare(b.team_name, "ru");
  });
}
