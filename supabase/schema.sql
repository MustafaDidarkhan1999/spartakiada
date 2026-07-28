-- Spartakiada ICK 2026 — initial schema
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'moderator', 'judge');
create type public.schedule_status as enum (
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled'
);
create type public.result_status as enum ('draft', 'published');

-- Profiles (linked to auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'judge',
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.disciplines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  counts_to_overall boolean not null default true,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (discipline_id, user_id)
);

create table public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid references public.disciplines (id) on delete set null,
  title text,
  team_a_id uuid references public.teams (id) on delete set null,
  team_b_id uuid references public.teams (id) on delete set null,
  starts_at timestamptz not null,
  location text,
  status public.schedule_status not null default 'scheduled',
  round_label text,
  notes text,
  score_a numeric,
  score_b numeric,
  result_text text,
  weight_kg numeric,
  is_absolute boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discipline_results (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  score numeric,
  place int check (place is null or place > 0),
  status public.result_status not null default 'published',
  entered_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (discipline_id, team_id)
);

create index idx_schedule_starts_at on public.schedule_events (starts_at);
create index idx_results_discipline on public.discipline_results (discipline_id);
create index idx_results_team on public.discipline_results (team_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'judge'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schedule_events_updated_at
  before update on public.schedule_events
  for each row execute function public.set_updated_at();

create trigger discipline_results_updated_at
  before update on public.discipline_results
  for each row execute function public.set_updated_at();

-- Helper: role check
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  );
$$;

create or replace function public.is_judge_for_discipline(discipline uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.judge_assignments
    where user_id = auth.uid() and discipline_id = discipline
  )
  or public.is_admin()
  or public.is_moderator_or_admin();
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.disciplines enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.schedule_events enable row level security;
alter table public.discipline_results enable row level security;

-- Public read for live boards
create policy "Public read teams" on public.teams
  for select using (true);

create policy "Public read disciplines" on public.disciplines
  for select using (true);

create policy "Public read schedule" on public.schedule_events
  for select using (true);

create policy "Public read published results" on public.discipline_results
  for select using (status = 'published' or auth.uid() is not null);

-- Profiles
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "Admin manage profiles" on public.profiles
  for all using (public.is_admin());

-- Teams
create policy "Moderator manage teams" on public.teams
  for all using (public.is_moderator_or_admin());

-- Disciplines
create policy "Moderator manage disciplines" on public.disciplines
  for all using (public.is_moderator_or_admin());

-- Judge assignments
create policy "Read assignments" on public.judge_assignments
  for select using (auth.uid() is not null);

create policy "Admin manage assignments" on public.judge_assignments
  for all using (public.is_admin());

-- Schedule
create policy "Moderator manage schedule" on public.schedule_events
  for all using (public.is_moderator_or_admin());

-- Results
create policy "Moderator manage all results" on public.discipline_results
  for all using (public.is_moderator_or_admin());

create policy "Judge upsert assigned results" on public.discipline_results
  for insert with check (public.is_judge_for_discipline(discipline_id));

create policy "Judge update assigned results" on public.discipline_results
  for update using (public.is_judge_for_discipline(discipline_id));

create policy "Judge delete assigned results" on public.discipline_results
  for delete using (public.is_judge_for_discipline(discipline_id));

-- Realtime
alter publication supabase_realtime add table public.schedule_events;
alter publication supabase_realtime add table public.discipline_results;
alter publication supabase_realtime add table public.teams;

-- Seed disciplines
insert into public.disciplines (name, counts_to_overall, sort_order) values
  ('Мини-футбол', true, 1),
  ('Волейбол', true, 2),
  ('Настольный теннис', true, 3),
  ('Тоғызқұмалақ', true, 4),
  ('Шахматы', true, 5),
  ('Арқан тарту', true, 6),
  ('Армрестлинг', true, 7),
  ('Киберспорт (CS2)', true, 8),
  ('Қазақша күрес', true, 9),
  ('Белка', false, 10);

-- Seed teams
insert into public.teams (name, sort_order) values
  ('Arystan', 1),
  ('ТОБОЛ', 2),
  ('ЯКСТАРТ', 3),
  ('BARS', 4),
  ('DDM United', 5),
  ('DDU City', 6),
  ('САМҒАУ', 7),
  ('НОМАД', 8),
  ('Туран', 9),
  ('Fartuna', 10),
  ('Namys', 11),
  ('Aqmola', 12),
  ('Ordabasy', 13),
  ('Prime', 14),
  ('Karabatan', 15),
  ('Gas Stream', 16),
  ('ERG team', 17),
  ('Pink Panther', 18);

-- After creating first user in Supabase Auth, make them admin:
-- update public.profiles set role = 'admin' where id = 'YOUR-USER-UUID';
