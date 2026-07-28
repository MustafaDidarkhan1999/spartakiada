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
 * Group-stage table: win = 3, draw = 1, loss = 0.
 * Uses finished/live matches (or any match with a score).
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

    // Discipline must match the group (when set on the event).
    if (
      event.discipline_id != null &&
      event.discipline_id !== group.discipline_id
    ) {
      return false;
    }

    const bothInGroup =
      memberIdSet.has(event.team_a_id) && memberIdSet.has(event.team_b_id);

    // Explicit group on the match wins; otherwise infer from roster.
    if (event.group_id != null) return event.group_id === group.id;
    return bothInGroup;
  });

  for (const event of relevant) {
    const scores = getMatchScores(event);
    if (!scores || !event.team_a_id || !event.team_b_id) continue;

    const rowA = rows.get(event.team_a_id);
    const rowB = rows.get(event.team_b_id);
    if (!rowA || !rowB) continue;

    rowA.played += 1;
    rowB.played += 1;
    rowA.goals_for += scores.a;
    rowA.goals_against += scores.b;
    rowB.goals_for += scores.b;
    rowB.goals_against += scores.a;

    if (scores.a > scores.b) {
      rowA.wins += 1;
      rowA.points += 3;
      rowB.losses += 1;
    } else if (scores.a < scores.b) {
      rowB.wins += 1;
      rowB.points += 3;
      rowA.losses += 1;
    } else {
      rowA.draws += 1;
      rowB.draws += 1;
      rowA.points += 1;
      rowB.points += 1;
    }
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
