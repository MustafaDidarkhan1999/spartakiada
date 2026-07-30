export type UserRole = "admin" | "moderator" | "judge";

export type ScheduleStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type ResultStatus = "draft" | "published";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
  short_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Discipline = {
  id: string;
  name: string;
  counts_to_overall: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type ScheduleEvent = {
  id: string;
  discipline_id: string | null;
  group_id?: string | null;
  title: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  starts_at: string;
  location: string | null;
  status: ScheduleStatus;
  round_label: string | null;
  notes: string | null;
  score_a: number | null;
  score_b: number | null;
  result_text: string | null;
  weight_kg: number | null;
  is_absolute: boolean;
  created_at: string;
  updated_at: string;
  discipline?: Discipline | null;
  team_a?: Team | null;
  team_b?: Team | null;
};

export type TournamentGroup = {
  id: string;
  discipline_id: string;
  name: string;
  max_teams: number;
  sort_order: number;
  created_at: string;
  discipline?: Discipline | null;
};

export type GroupTeam = {
  id: string;
  group_id: string;
  discipline_id: string;
  team_id: string;
  sort_order: number;
  created_at: string;
  team?: Team | null;
};

export type DisciplineResult = {
  id: string;
  discipline_id: string;
  team_id: string;
  score: number | null;
  place: number | null;
  status: ResultStatus;
  entered_by: string | null;
  updated_at: string;
  team?: Team;
  discipline?: Discipline;
};

export type OverallStanding = {
  team_id: string;
  team_name: string;
  place_sum: number;
  disciplines_count: number;
  first_places: number;
  second_places: number;
  third_places: number;
  is_manual?: boolean;
  manual_place?: number | null;
};

export type OverallPlace = {
  team_id: string;
  place: number;
  entered_by: string | null;
  updated_at: string;
};

export type OverallMode = "auto" | "manual";

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  scheduled: "Ожидается",
  live: "Идёт",
  finished: "Завершён",
  postponed: "Перенесён",
  cancelled: "Отменён",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Администратор",
  moderator: "Модератор",
  judge: "Судья",
};
