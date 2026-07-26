-- Groups for mini-football / volleyball
-- Run in Supabase SQL Editor

create table if not exists public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  name text not null,
  max_teams int not null default 4 check (max_teams > 0 and max_teams <= 16),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (discipline_id, name)
);

create table if not exists public.group_teams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tournament_groups (id) on delete cascade,
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, team_id),
  unique (discipline_id, team_id)
);

create index if not exists idx_tournament_groups_discipline
  on public.tournament_groups (discipline_id);

create index if not exists idx_group_teams_group
  on public.group_teams (group_id);

-- Optional: link schedule match to a group
alter table public.schedule_events
  add column if not exists group_id uuid references public.tournament_groups (id) on delete set null;

alter table public.tournament_groups enable row level security;
alter table public.group_teams enable row level security;

drop policy if exists "Public read tournament groups" on public.tournament_groups;
create policy "Public read tournament groups" on public.tournament_groups
  for select using (true);

drop policy if exists "Moderator manage tournament groups" on public.tournament_groups;
create policy "Moderator manage tournament groups" on public.tournament_groups
  for all using (public.is_moderator_or_admin());

drop policy if exists "Public read group teams" on public.group_teams;
create policy "Public read group teams" on public.group_teams
  for select using (true);

drop policy if exists "Moderator manage group teams" on public.group_teams;
create policy "Moderator manage group teams" on public.group_teams
  for all using (public.is_moderator_or_admin());

-- Seed default groups for football & volleyball (if not exist)
insert into public.tournament_groups (discipline_id, name, max_teams, sort_order)
select d.id, g.name, g.max_teams, g.sort_order
from public.disciplines d
cross join (
  values
    ('A', 4, 1),
    ('B', 4, 2),
    ('C', 4, 3),
    ('D', 4, 4)
) as g(name, max_teams, sort_order)
where d.name in ('Мини-футбол', 'Волейбол')
on conflict (discipline_id, name) do nothing;
